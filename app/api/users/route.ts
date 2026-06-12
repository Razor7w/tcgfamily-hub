import { NextRequest, NextResponse } from 'next/server'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import {
  isoOrNull,
  resolveStoreWalletForUser,
  type LeanUserWallet
} from '@/lib/store-credit-resolve'
import { normalizeEmail, validateEmailFormat } from '@/lib/password-rules'
import {
  popidForStorage,
  rutForStorage,
  validatePopidOptional
} from '@/lib/rut-chile'
import { getRutFieldError } from '@/lib/rut-input'

// GET - Listar todos los usuarios del sistema (sin filtrar por defaultStoreId ni tienda activa)
export async function GET() {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    await connectDB()

    const users = await User.aggregate<{
      _id: unknown
      name?: string
      email?: string
      emailVerified?: Date
      image?: string
      role?: 'user' | 'admin'
      phone?: string
      rut?: string
      popid?: string
      mustChangePassword?: boolean
      storePoints?: number
      storePointsExpiringNext?: number
      storePointsExpiryDate?: Date
      storeCredits?: LeanUserWallet['storeCredits']
      hasPassword: boolean
    }>([
      { $sort: { createdAt: -1 } },
      {
        $project: {
          name: 1,
          email: 1,
          emailVerified: 1,
          image: 1,
          role: 1,
          phone: 1,
          rut: 1,
          popid: 1,
          mustChangePassword: 1,
          storePoints: 1,
          storePointsExpiringNext: 1,
          storePointsExpiryDate: 1,
          storeCredits: 1,
          hasPassword: {
            $gt: [{ $strLenCP: { $ifNull: ['$passwordHash', ''] } }, 0]
          }
        }
      }
    ])

    const primary = gate.primaryStoreOid

    const usersWithId = users.map(user => {
      const w = resolveStoreWalletForUser(
        user as LeanUserWallet,
        gate.activeStoreOid,
        primary
      )

      return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role || 'user',
        phone: user.phone || '',
        rut: user.rut || '',
        popid: user.popid || '',
        hasPassword: Boolean(user.hasPassword),
        mustChangePassword: Boolean(user.mustChangePassword),
        storePoints: w.storePoints,
        storePointsExpiringNext: w.storePointsExpiringNext,
        storePointsExpiryDate: isoOrNull(w.storePointsExpiryDate)
      }
    })

    return NextResponse.json(usersWithId)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

// POST - Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const body = await request.json()
    const {
      name,
      email,
      role = 'user',
      phone = '',
      rut = '',
      popid = ''
    } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      )
    }

    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const emailNorm = normalizeEmail(String(email))
    const emailErr = validateEmailFormat(emailNorm)
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 })
    }

    const rutStr = typeof rut === 'string' ? rut : ''
    const popidStr = typeof popid === 'string' ? popid : ''
    if (rutStr.trim()) {
      const rutErr = getRutFieldError(rutStr, false)
      if (rutErr) return NextResponse.json({ error: rutErr }, { status: 400 })
    }
    const popidErr = validatePopidOptional(popidStr)
    if (popidErr) {
      return NextResponse.json({ error: popidErr }, { status: 400 })
    }

    await connectDB()

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: emailNorm }).collation({
      locale: 'en',
      strength: 2
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      )
    }

    const newUser = await User.create({
      name,
      email: emailNorm,
      role,
      phone,
      rut: rutStr.trim() ? rutForStorage(rutStr) : '',
      popid: popidForStorage(popidStr),
      accounts: [],
      sessions: []
    })

    return NextResponse.json(
      {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone || '',
        rut: newUser.rut || '',
        popid: newUser.popid || '',
        storePoints: newUser.storePoints ?? 0,
        storePointsExpiringNext: newUser.storePointsExpiringNext ?? 0,
        storePointsExpiryDate: newUser.storePointsExpiryDate
          ? new Date(newUser.storePointsExpiryDate).toISOString()
          : null
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
