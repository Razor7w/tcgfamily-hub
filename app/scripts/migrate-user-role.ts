/**
 * Migración de usuarios + tienda primaria TCGFamily.
 *
 * 1. Crea la tienda si no existe: `name: "TCGFamily"`, `slug: "tcgfamily"` (ver
 *    `DEFAULT_PRIMARY_STORE_SLUG`), alineado con `bootstrap-multitenancy.ts`.
 * 2. Asigna `role: "user"` a usuarios sin el campo `role`.
 * 3. Asigna `defaultStoreId` a la tienda primaria en usuarios que aún no tienen
 *    preferencia (campo ausente o `null`), p. ej. cuentas creadas en la era
 *    solo-TCGFamily antes del multitenant.
 *
 * Ejecutar con: npx tsx --env-file=.env.local app/scripts/migrate-user-role.ts
 *
 * Idempotente: re-ejecutar no cambia roles ya fijados ni `defaultStoreId` ya
 * elegido por el usuario.
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import User from '@/models/User'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'

async function ensurePrimaryStore(): Promise<mongoose.Types.ObjectId> {
  let store = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
  if (!store) {
    store = await Store.create({
      slug: DEFAULT_PRIMARY_STORE_SLUG,
      name: 'TCGFamily',
      isActive: true
    })
    console.log(`✓ Tienda creada: ${store.name} (${store.slug})`)
  } else {
    console.log(`✓ Tienda ya existe: ${store.name} (${store.slug})`)
  }
  return store._id as mongoose.Types.ObjectId
}

async function migrateUserRoles() {
  try {
    await connectDB()
    console.log('🔄 Iniciando migración de usuarios / tienda primaria...')

    const storeOid = await ensurePrimaryStore()

    console.log('🔄 Roles: usuarios sin campo `role` → "user"...')
    const result = await User.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    )

    console.log(
      `✅ Roles: ${result.modifiedCount} usuarios actualizados (${result.matchedCount} coincidencias)`
    )

    const usersWithoutRole = await User.countDocuments({
      role: { $exists: false }
    })

    if (usersWithoutRole > 0) {
      console.warn(
        `⚠️  Aún hay ${usersWithoutRole} usuarios sin el campo 'role'`
      )
    } else {
      console.log("✅ Todos los usuarios tienen el campo 'role'")
    }

    console.log(
      '🔄 defaultStoreId: usuarios sin preferencia → tienda primaria...'
    )
    const def = await User.updateMany(
      {
        $or: [{ defaultStoreId: { $exists: false } }, { defaultStoreId: null }]
      },
      { $set: { defaultStoreId: storeOid } }
    )
    console.log(
      `✅ defaultStoreId: ${def.modifiedCount} usuarios actualizados (${def.matchedCount} sin preferencia previa)`
    )

    process.exit(0)
  } catch (error) {
    console.error('❌ Error en la migración:', error)
    process.exit(1)
  }
}

migrateUserRoles()
