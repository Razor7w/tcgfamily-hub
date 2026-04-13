/**
 * Script de migración para agregar el campo 'role' a usuarios existentes
 * Ejecutar con: npx tsx app/scripts/migrate-user-role.ts
 */

import connectDB from '@/lib/mongodb'
import User from '@/models/User'

async function migrateUserRoles() {
  try {
    await connectDB()
    console.log('🔄 Iniciando migración de roles de usuario...')

    // Actualizar todos los usuarios que no tienen el campo 'role'
    const result = await User.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    )

    console.log(
      `✅ Migración completada: ${result.modifiedCount} usuarios actualizados`
    )
    console.log(`📊 Total de usuarios procesados: ${result.matchedCount}`)

    // Verificar que todos los usuarios tienen el campo role
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

    process.exit(0)
  } catch (error) {
    console.error('❌ Error en la migración:', error)
    process.exit(1)
  }
}

migrateUserRoles()
