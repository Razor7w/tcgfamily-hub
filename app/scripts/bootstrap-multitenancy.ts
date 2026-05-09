/**
 * Migración inicial multitenant — ejecutar una vez por entorno (local/staging antes de prod):
 * `npx tsx app/scripts/bootstrap-multitenancy.ts`
 *
 * 1. Crea u obtiene la tienda `tcgfamily`.
 * 2. Asigna `storeId` en documentos sin campo (WeeklyEvent, League, Mail).
 * 3. Fija `storeId` en DashboardModuleSettings global legacy.
 * 4. Otorga rol `owner` en StoreMembership para cada User con role `admin` legacy.
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import StoreMembership from '@/models/StoreMembership'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'
import League from '@/models/League'
import Mail from '@/models/Mails'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { applyStoreCreditSlice } from '@/lib/store-credit-slice-write'

async function bootstrap() {
  await connectDB()
  console.info('🔗 Conectado a MongoDB')

  let store = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
  if (!store) {
    store = await Store.create({
      slug: DEFAULT_PRIMARY_STORE_SLUG,
      name: 'TCGFamily',
      isActive: true
    })
    console.info(`✓ Tienda creada: ${store.slug} (${store._id})`)
  } else {
    console.info(`✓ Tienda existente: ${store.slug} (${store._id})`)
  }
  const storeOid = store._id as mongoose.Types.ObjectId

  const ew = await WeeklyEvent.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId: storeOid } }
  )
  console.info(`WeeklyEvent migrados sin storeId → ${ew.modifiedCount}`)

  const el = await League.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId: storeOid } }
  )
  console.info(`League migradas sin storeId → ${el.modifiedCount}`)

  const em = await Mail.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId: storeOid } }
  )
  console.info(`Mail migrados sin storeId → ${em.modifiedCount}`)

  const dash = await DashboardModuleSettings.updateMany(
    {
      $or: [{ storeId: { $exists: false } }, { storeId: null }]
    },
    { $set: { storeId: storeOid } }
  )
  console.info(
    `DashboardModuleSettings docs sin storeId actualizados → ${dash.modifiedCount}`
  )

  const admins = await User.find({ role: 'admin' }).select('_id').lean()
  for (const a of admins) {
    const uid = new mongoose.Types.ObjectId(String(a._id))
    await StoreMembership.updateOne(
      { userId: uid, storeId: storeOid },
      { $setOnInsert: { role: 'owner' } },
      { upsert: true }
    )
  }
  console.info(
    `StoreMembership: garantizado rol owner para ${admins.length} usuario(s) admin legacy`
  )

  const walletCursor = User.find({
    $nor: [{ storeCredits: { $elemMatch: { storeId: storeOid } } }]
  })
    .select('_id storePoints storePointsExpiringNext storePointsExpiryDate')
    .cursor()

  let walletMigrated = 0
  for await (const u of walletCursor) {
    const lean = u as {
      _id: mongoose.Types.ObjectId
      storePoints?: number
      storePointsExpiringNext?: number
      storePointsExpiryDate?: Date
    }
    const saldo = lean.storePoints ?? 0
    const prox = lean.storePointsExpiringNext ?? 0
    const exp = lean.storePointsExpiryDate
    if (saldo === 0 && prox === 0 && !exp) continue
    await applyStoreCreditSlice(lean._id, storeOid, {
      saldo,
      proximosVencer: prox,
      expiry: exp ?? null
    })
    walletMigrated++
  }
  console.info(
    `User.storeCredits: copiado wallet legacy → slice primario en ${walletMigrated} usuario(s)`
  )

  console.info(
    '⚠️  Tras ejecutar esto conviene crear índices en Mongo si no existían (compound unique Liga/Mail si usas nueva versión del schema).'
  )
  process.exit(0)
}

bootstrap().catch(e => {
  console.error(e)
  process.exit(1)
})
