/**
 * Otorga rol owner en StoreMembership sobre una tienda (por slug).
 *
 * Ejemplos:
 *   npx tsx --env-file=.env.local app/scripts/grant-store-owner.ts seba.carroza@gmail.com
 *   npx tsx --env-file=.env.local app/scripts/grant-store-owner.ts seba.carroza@gmail.com tcgfamily
 *
 * El usuario debe existir en `users`. Luego debe cerrar sesión y entrar de nuevo
 * en la app (o usar la UI de selección de tienda) para refrescar JWT.
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import StoreMembership from '@/models/StoreMembership'
import User from '@/models/User'
import { normalizeEmail } from '@/lib/password-rules'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'

async function main() {
  const [, , emailRaw, slugArg] = process.argv
  const emailNorm = normalizeEmail(String(emailRaw ?? '').trim())

  const slug =
    typeof slugArg === 'string' && slugArg.trim()
      ? slugArg.trim().toLowerCase()
      : DEFAULT_PRIMARY_STORE_SLUG

  if (!emailNorm) {
    console.error('Uso: grant-store-owner.ts <correo> [slug-tienda]')
    process.exit(1)
  }

  await connectDB()

  const user = await User.findOne({ email: emailNorm })
    .collation({ locale: 'en', strength: 2 })
    .select('_id email name')
    .lean<{
      _id: mongoose.Types.ObjectId
      email?: string
      name?: string
    } | null>()

  if (!user) {
    console.error(
      `No hay usuario registrado con el correo ${emailNorm}. Crea la cuenta primero en la app.`
    )
    process.exit(1)
  }

  const store = await Store.findOne({ slug })
    .select('_id slug name')
    .lean<{ _id: mongoose.Types.ObjectId; slug: string; name: string } | null>()
  if (!store) {
    console.error(`Tienda slug "${slug}" no encontrada.`)
    console.error(
      'Si aún no migraste multitenant en esta base, ejecuta antes: npx tsx --env-file=.env.local app/scripts/bootstrap-multitenancy.ts'
    )
    process.exit(1)
  }

  await StoreMembership.updateOne(
    { userId: user._id, storeId: store._id },
    { $set: { role: 'owner' } },
    { upsert: true }
  )

  console.info(
    `✓ ${emailNorm} ahora tiene rol owner en "${store.name}" (${store.slug}).`
  )
  console.info(
    '  Tras esto: cerrar sesión en la app y volver a entrar (o /select-store).'
  )
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
