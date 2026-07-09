/**
 * Crea cuentas dev para pruebas online (email + contraseña local).
 *
 *   npx tsx --env-file=.env.local app/scripts/create-dev-online-users.ts '<contraseña>'
 *
 * Idempotente: si el correo ya existe con contraseña, actualiza hash; si existe sin
 * contraseña (OAuth), le asigna contraseña local.
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Store from '@/models/Store'
import { hashPassword } from '@/lib/password-server'
import { normalizeEmail, validatePasswordStrength } from '@/lib/password-rules'
import { chileRutVerificationDigit } from '@/lib/rut-chile'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'

const DEV_ACCOUNTS = [
  {
    email: 'dev-online-01@tcgfamily.local',
    name: 'Dev Online 01',
    rutBody: '26000001'
  },
  {
    email: 'dev-online-02@tcgfamily.local',
    name: 'Dev Online 02',
    rutBody: '26000002'
  },
  {
    email: 'dev-online-03@tcgfamily.local',
    name: 'Dev Online 03',
    rutBody: '26000003'
  },
  {
    email: 'dev-online-04@tcgfamily.local',
    name: 'Dev Online 04',
    rutBody: '26000004'
  }
] as const

function rutForBody(body: string) {
  return `${body}-${chileRutVerificationDigit(body)}`
}

async function main() {
  const password = process.argv[2]
  if (!password) {
    console.error(
      'Uso: create-dev-online-users.ts <contraseña>\n' +
        "Ej.: npx tsx --env-file=.env.local app/scripts/create-dev-online-users.ts 'TuPass123!'"
    )
    process.exit(1)
  }

  const passErr = validatePasswordStrength(password)
  if (passErr) {
    console.error(`Contraseña inválida: ${passErr}`)
    process.exit(1)
  }

  await connectDB()

  const store = await Store.findOne({
    slug: DEFAULT_PRIMARY_STORE_SLUG,
    isActive: true
  })
    .select('_id slug name')
    .lean<{ _id: mongoose.Types.ObjectId; slug: string; name: string } | null>()

  if (!store) {
    console.error(
      `Tienda "${DEFAULT_PRIMARY_STORE_SLUG}" no encontrada o inactiva.`
    )
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)

  for (const account of DEV_ACCOUNTS) {
    const email = normalizeEmail(account.email)
    const rut = rutForBody(account.rutBody)

    const existing = await User.findOne({ email })
      .collation({ locale: 'en', strength: 2 })
      .select('+passwordHash')

    if (existing) {
      existing.name = account.name
      existing.email = email
      existing.passwordHash = passwordHash
      existing.credentialFailedAttempts = 0
      existing.credentialLockedUntil = undefined
      existing.mustChangePassword = false
      if (!existing.rut) existing.rut = rut
      if (!existing.defaultStoreId) existing.defaultStoreId = store._id
      await existing.save()
      console.info(`↻ actualizado  ${email}  (rut ${existing.rut || rut})`)
      continue
    }

    const rutTaken = await User.findOne({ rut })
      .select('_id email')
      .lean<{ _id: mongoose.Types.ObjectId; email?: string } | null>()
    if (rutTaken) {
      console.error(
        `✗ ${email}: RUT ${rut} ya usado por ${rutTaken.email ?? String(rutTaken._id)}`
      )
      continue
    }

    await User.create({
      name: account.name,
      email,
      passwordHash,
      credentialFailedAttempts: 0,
      mustChangePassword: false,
      role: 'user',
      phone: '',
      rut,
      popid: '',
      defaultStoreId: store._id,
      accounts: [],
      sessions: []
    })
    console.info(`✓ creado      ${email}  (rut ${rut})`)
  }

  console.info(`\nTienda por defecto: ${store.name} (${store.slug})`)
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
