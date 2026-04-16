import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { normalizeEmail, validateEmailFormat } from '@/lib/password-rules'
import {
  popidForStorage,
  rutForStorage,
  validatePopidOptional
} from '@/lib/rut-chile'
import { getRutFieldError } from '@/lib/rut-input'

// GET - Listar todos los usuarios
export async function GET() {
  try {
    const session = await auth()

    // Verificar que el usuario esté autenticado y sea admin
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    const users = await User.find({})
      .select('-accounts -sessions -passwordHash')
      .sort({ createdAt: -1 })
      .lean()

    const usersWithId = users.map(user => {
      // Type assertion para el objeto lean
      const userObj = user as unknown as {
        _id: { toString(): string }
        name?: string
        email?: string
        emailVerified?: Date
        image?: string
        role?: 'user' | 'admin'
        phone?: string
        rut?: string
        popid?: string
        storePoints?: number
        storePointsExpiringNext?: number
        storePointsExpiryDate?: Date
      }

      return {
        id: userObj._id.toString(),
        name: userObj.name,
        email: userObj.email,
        emailVerified: userObj.emailVerified,
        image: userObj.image,
        role: userObj.role || 'user',
        phone: userObj.phone || '',
        rut: userObj.rut || '',
        popid: userObj.popid || '',
        storePoints: userObj.storePoints ?? 0,
        storePointsExpiringNext: userObj.storePointsExpiringNext ?? 0,
        storePointsExpiryDate: userObj.storePointsExpiryDate
          ? new Date(userObj.storePointsExpiryDate).toISOString()
          : null
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
    const session = await auth()

    // Verificar que el usuario esté autenticado y sea admin
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
