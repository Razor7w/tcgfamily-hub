import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { hashPassword, verifyPassword } from '@/lib/password-server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2BucketName, r2Client, r2PublicBaseUrl } from '@/lib/r2'
import {
  validatePasswordStrength,
  validateRegisterName
} from '@/lib/password-rules'
import { validatePopidOptional, popidForStorage } from '@/lib/rut-chile'
import { canUserActivateDashboardStore } from '@/lib/multitenancy/session-store-hydrate'

function isR2KeyForUser(userId: string, key: string): boolean {
  if (!userId || !key) return false
  if (key.startsWith(`uploads/${userId}/`)) return true
  // Legacy profile avatars
  if (key.startsWith(`profileImages/${userId}/`)) return true
  // Avatar/<userId>.<ext>
  return (
    key.startsWith(`Avatar/${userId}.`) &&
    key.length > `Avatar/${userId}.`.length
  )
}

function keyFromPublicUrl(url: string): string | null {
  const base = r2PublicBaseUrl()
  if (!url.startsWith(`${base}/`)) return null
  const key = url.slice(base.length + 1)
  return key || null
}

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
      imageKey?: string
      rut?: string
      popid?: string
      phone?: string
      role?: string
      passwordHash?: string
      defaultStoreId?: mongoose.Types.ObjectId | null
    }

    const defSid =
      u.defaultStoreId != null ? u.defaultStoreId.toString() : null

    return NextResponse.json({
      id: u._id.toString(),
      name: u.name ?? '',
      email: u.email ?? '',
      image: u.image ?? '',
      imageKey: u.imageKey ?? '',
      rut: u.rut ?? '',
      popid: u.popid ?? '',
      phone: u.phone ?? '',
      role: u.role ?? 'user',
      hasPassword: Boolean(u.passwordHash),
      defaultStoreId: defSid
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

    const {
      name,
      popid,
      currentPassword,
      newPassword,
      confirmNewPassword,
      image,
      imageKey,
      defaultStoreId
    } = body as Record<string, unknown>

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
    const hasImage = image !== undefined || imageKey !== undefined
    const hasDefaultStore = Object.prototype.hasOwnProperty.call(
      body as object,
      'defaultStoreId'
    )

    if (
      !wantsPasswordChange &&
      !hasName &&
      !hasPop &&
      !hasImage &&
      !hasDefaultStore
    ) {
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

    if (hasDefaultStore) {
      if (defaultStoreId === null || defaultStoreId === '') {
        user.set('defaultStoreId', null)
      } else if (typeof defaultStoreId === 'string') {
        const sid = defaultStoreId.trim()
        if (!mongoose.Types.ObjectId.isValid(sid)) {
          return NextResponse.json(
            { error: 'Tienda predeterminada inválida.' },
            { status: 400 }
          )
        }
        const oid = new mongoose.Types.ObjectId(sid)
        const allowed = await canUserActivateDashboardStore(
          session.user.id,
          oid
        )
        if (!allowed) {
          return NextResponse.json(
            { error: 'No tenés acceso a esa tienda.' },
            { status: 403 }
          )
        }
        user.defaultStoreId = oid
      } else {
        return NextResponse.json(
          { error: 'defaultStoreId inválido.' },
          { status: 400 }
        )
      }
    }

    const oldImageKey: string =
      typeof user.imageKey === 'string' ? user.imageKey : ''

    if (hasImage) {
      const imageStr = typeof image === 'string' ? image.trim() : ''
      const imageKeyStr = typeof imageKey === 'string' ? imageKey.trim() : ''

      if (!imageStr || !imageKeyStr) {
        return NextResponse.json(
          { error: 'Falta image o imageKey.' },
          { status: 400 }
        )
      }

      if (!isR2KeyForUser(session.user.id, imageKeyStr)) {
        return NextResponse.json(
          { error: 'imageKey inválido.' },
          { status: 400 }
        )
      }

      const derived = keyFromPublicUrl(imageStr)
      if (derived !== imageKeyStr) {
        return NextResponse.json(
          { error: 'image e imageKey no coinciden.' },
          { status: 400 }
        )
      }

      user.image = imageStr
      user.imageKey = imageKeyStr
    }

    await user.save()

    const hasPassword = Boolean(user.passwordHash)

    if (hasImage && oldImageKey && oldImageKey !== user.imageKey) {
      if (isR2KeyForUser(session.user.id, oldImageKey)) {
        try {
          const s3 = r2Client()
          await s3.send(
            new DeleteObjectCommand({
              Bucket: r2BucketName(),
              Key: oldImageKey
            })
          )
        } catch (e) {
          console.error('R2 delete old profile image failed:', e)
        }
      }
    }

    const defOut =
      user.defaultStoreId != null
        ? (user.defaultStoreId as mongoose.Types.ObjectId).toString()
        : null

    return NextResponse.json({
      ok: true,
      name: user.name ?? '',
      popid: user.popid ?? '',
      hasPassword,
      image: user.image ?? '',
      imageKey: typeof user.imageKey === 'string' ? user.imageKey : '',
      defaultStoreId: defOut
    })
  } catch (e) {
    console.error('PATCH /api/me:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el perfil.' },
      { status: 500 }
    )
  }
}
