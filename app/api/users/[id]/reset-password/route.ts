import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { hashPassword } from '@/lib/password-server'
import { generateTemporaryPassword } from '@/lib/temporary-password'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { id } = await params
    let userId: mongoose.Types.ObjectId
    try {
      userId = new mongoose.Types.ObjectId(id)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    await connectDB()
    const user = await User.findById(userId).select('+passwordHash')
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            'Este usuario no tiene contraseña local (p. ej. solo Google). No se puede resetear así.'
        },
        { status: 400 }
      )
    }

    const temporaryPassword = generateTemporaryPassword()
    user.passwordHash = await hashPassword(temporaryPassword)
    user.mustChangePassword = true
    user.credentialFailedAttempts = 0
    user.credentialLockedUntil = undefined
    await user.save()

    return NextResponse.json({
      ok: true,
      temporaryPassword,
      message:
        'Contraseña temporal generada. Compártela de forma segura; el usuario deberá cambiarla al iniciar sesión.'
    })
  } catch (error) {
    console.error('POST /api/users/[id]/reset-password:', error)
    return NextResponse.json(
      { error: 'No se pudo resetear la contraseña' },
      { status: 500 }
    )
  }
}
