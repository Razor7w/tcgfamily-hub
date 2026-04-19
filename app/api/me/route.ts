import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { hashPassword, verifyPassword } from '@/lib/password-server'
import {
  validatePasswordStrength,
  validateRegisterName
} from '@/lib/password-rules'
import { validatePopidOptional, popidForStorage } from '@/lib/rut-chile'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(session.user.id)
      .select('+passwordHash')
      .lean()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const u = user as {
      _id: { toString(): string }
      name?: string
      email?: string
      image?: string
      rut?: string
      popid?: string
      phone?: string
      role?: string
      passwordHash?: string
    }

    return NextResponse.json({
      id: u._id.toString(),
      name: u.name ?? '',
      email: u.email ?? '',
      image: u.image ?? '',
      rut: u.rut ?? '',
      popid: u.popid ?? '',
      phone: u.phone ?? '',
      role: u.role ?? 'user',
      hasPassword: Boolean(u.passwordHash)
    })
  } catch (e) {
    console.error('GET /api/me:', e)
    return NextResponse.json(
      { error: 'Error al cargar el perfil' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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

    const { name, popid, currentPassword, newPassword, confirmNewPassword } =
      body as Record<string, unknown>

    await connectDB()
    const user = await User.findById(session.user.id).select('+passwordHash')
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const wantsPasswordChange =
      typeof newPassword === 'string' && newPassword.length > 0
    const hasName = name !== undefined
    const hasPop = popid !== undefined

    if (!wantsPasswordChange && !hasName && !hasPop) {
      return NextResponse.json(
        { error: 'No hay cambios para guardar.' },
        { status: 400 }
      )
    }

    if (wantsPasswordChange) {
      if (!user.passwordHash) {
        return NextResponse.json(
          {
            error:
              'Tu cuenta no tiene contraseña local. Solo puedes cambiarla si te registraste con correo y contraseña.'
          },
          { status: 400 }
        )
      }
      const cur = typeof currentPassword === 'string' ? currentPassword : ''
      const conf =
        typeof confirmNewPassword === 'string' ? confirmNewPassword : ''
      if (!cur) {
        return NextResponse.json(
          { error: 'Indica tu contraseña actual.' },
          { status: 400 }
        )
      }
      if (newPassword !== conf) {
        return NextResponse.json(
          { error: 'La nueva contraseña y la confirmación no coinciden.' },
          { status: 400 }
        )
      }
      const passErr = validatePasswordStrength(newPassword)
      if (passErr) {
        return NextResponse.json({ error: passErr }, { status: 400 })
      }
      const ok = await verifyPassword(cur, user.passwordHash)
      if (!ok) {
        return NextResponse.json(
          { error: 'La contraseña actual no es correcta.' },
          { status: 400 }
        )
      }
      user.passwordHash = await hashPassword(newPassword)
    }

    if (hasName) {
      const nameStr = typeof name === 'string' ? name : ''
      const nameErr = validateRegisterName(nameStr)
      if (nameErr) {
        return NextResponse.json({ error: nameErr }, { status: 400 })
      }
      user.name = nameStr.trim()
    }

    if (hasPop) {
      const popStr = typeof popid === 'string' ? popid : ''
      const popErr = validatePopidOptional(popStr)
      if (popErr) {
        return NextResponse.json({ error: popErr }, { status: 400 })
      }
      user.popid = popidForStorage(popStr)
    }

    await user.save()

    const hasPassword = Boolean(user.passwordHash)

    return NextResponse.json({
      ok: true,
      name: user.name ?? '',
      popid: user.popid ?? '',
      hasPassword
    })
  } catch (e) {
    console.error('PATCH /api/me:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el perfil.' },
      { status: 500 }
    )
  }
}
