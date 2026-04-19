import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { hashPassword } from '@/lib/password-server'
import {
  normalizeEmail,
  validateEmailFormat,
  validatePasswordStrength,
  validateRegisterName
} from '@/lib/password-rules'
import { rutMatchVariants } from '@/lib/store-points-csv'
import {
  popidForStorage,
  rutForStorage,
  validatePopidOptional
} from '@/lib/rut-chile'
import { getRutFieldError } from '@/lib/rut-input'
import { createSlidingWindowLimiter } from '@/lib/auth-rate-limit'

const registerIpLimiter = createSlidingWindowLimiter({
  max: 10,
  windowMs: 60 * 60 * 1000
})

function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    if (registerIpLimiter(`reg:${ip}`)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Prueba más tarde.' },
        { status: 429 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const {
      name,
      email: emailField,
      password,
      confirmPassword,
      rut,
      popid
    } = body as Record<string, unknown>

    const nameStr = typeof name === 'string' ? name : ''
    const emailStr = typeof emailField === 'string' ? emailField : ''
    const passwordStr = typeof password === 'string' ? password : ''
    const confirmStr =
      typeof confirmPassword === 'string' ? confirmPassword : ''
    const rutStr = typeof rut === 'string' ? rut : ''
    const popidStr = typeof popid === 'string' ? popid : ''

    if (passwordStr !== confirmStr) {
      return NextResponse.json(
        { error: 'Las contraseñas no coinciden.' },
        { status: 400 }
      )
    }

    const nameErr = validateRegisterName(nameStr)
    if (nameErr) {
      return NextResponse.json({ error: nameErr }, { status: 400 })
    }

    const email = normalizeEmail(emailStr)
    const emailErr = validateEmailFormat(email)
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 })
    }

    const rutErr = getRutFieldError(rutStr, true)
    if (rutErr) {
      return NextResponse.json({ error: rutErr }, { status: 400 })
    }

    const popidErr = validatePopidOptional(popidStr)
    if (popidErr) {
      return NextResponse.json({ error: popidErr }, { status: 400 })
    }

    const passErr = validatePasswordStrength(passwordStr)
    if (passErr) {
      return NextResponse.json({ error: passErr }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email })
      .collation({ locale: 'en', strength: 2 })
      .select('+passwordHash name rut popid')
    if (existing?.passwordHash) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este correo.' },
        { status: 409 }
      )
    }

    const rutStored = rutForStorage(rutStr)
    const rutVariants = rutMatchVariants(rutStored)
    const existingRut = await User.findOne({
      rut: { $in: rutVariants },
      ...(existing?._id ? { _id: { $ne: existing._id } } : {})
    }).select('_id')
    if (existingRut) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este RUT.' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(passwordStr)

    if (existing) {
      existing.name = nameStr.trim()
      existing.email = email
      existing.passwordHash = passwordHash
      existing.credentialFailedAttempts = 0
      existing.credentialLockedUntil = undefined
      existing.role = existing.role || 'user'
      existing.phone = existing.phone || ''
      existing.rut = rutStored
      existing.popid = popidForStorage(popidStr)
      await existing.save()
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    await User.create({
      name: nameStr.trim(),
      email,
      passwordHash,
      credentialFailedAttempts: 0,
      role: 'user',
      phone: '',
      rut: rutStored,
      popid: popidForStorage(popidStr),
      accounts: [],
      sessions: []
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error('register:', e)
    return NextResponse.json(
      { error: 'No se pudo completar el registro.' },
      { status: 500 }
    )
  }
}
