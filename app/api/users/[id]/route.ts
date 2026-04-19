import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import mongoose from 'mongoose'
import { normalizeEmail, validateEmailFormat } from '@/lib/password-rules'
import {
  popidForStorage,
  rutForStorage,
  validatePopidOptional
} from '@/lib/rut-chile'
import { getRutFieldError } from '@/lib/rut-input'

// GET - Obtener un usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const { id } = await params
    await connectDB()

    // Convertir el ID string a ObjectId para asegurar la búsqueda correcta
    let userId: mongoose.Types.ObjectId
    try {
      userId = new mongoose.Types.ObjectId(id)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const user = await User.findById(userId)
      .select('-accounts -sessions')
      .lean()

    if (!user || Array.isArray(user)) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

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

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const { id } = await params
    const body = await request.json()
    const { name, email, role, phone, rut, popid } = body

    await connectDB()

    // Convertir el ID string a ObjectId para asegurar la búsqueda correcta
    let userId: mongoose.Types.ObjectId
    try {
      userId = new mongoose.Types.ObjectId(id)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const user = await User.findById(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar campos si se proporcionan
    if (name !== undefined) user.name = name
    if (email !== undefined) {
      const emailNorm = normalizeEmail(String(email))
      const emailErr = validateEmailFormat(emailNorm)
      if (emailErr) {
        return NextResponse.json({ error: emailErr }, { status: 400 })
      }
      // Verificar si el email ya está en uso por otro usuario
      const existingUser = await User.findOne({
        email: emailNorm,
        _id: { $ne: userId }
      }).collation({ locale: 'en', strength: 2 })
      if (existingUser) {
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 400 }
        )
      }
      user.email = emailNorm
    }
    if (role !== undefined) {
      if (role !== 'user' && role !== 'admin') {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
      }
      user.role = role
    }
    if (phone !== undefined) user.phone = phone
    if (rut !== undefined) {
      const rutStr = typeof rut === 'string' ? rut : ''
      if (rutStr.trim()) {
        const rutErr = getRutFieldError(rutStr, false)
        if (rutErr) return NextResponse.json({ error: rutErr }, { status: 400 })
        user.rut = rutForStorage(rutStr)
      } else {
        user.rut = ''
      }
    }
    if (popid !== undefined) {
      const popidStr = typeof popid === 'string' ? popid : ''
      const popErr = validatePopidOptional(popidStr)
      if (popErr) return NextResponse.json({ error: popErr }, { status: 400 })
      user.popid = popidForStorage(popidStr)
    }

    await user.save()

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      rut: user.rut || '',
      popid: user.popid || '',
      storePoints: user.storePoints ?? 0,
      storePointsExpiringNext: user.storePointsExpiringNext ?? 0,
      storePointsExpiryDate: user.storePointsExpiryDate
        ? new Date(user.storePointsExpiryDate).toISOString()
        : null
    })
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const { id } = await params
    await connectDB()

    // Convertir el ID string a ObjectId para asegurar la búsqueda correcta
    let userId: mongoose.Types.ObjectId
    try {
      userId = new mongoose.Types.ObjectId(id)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const user = await User.findByIdAndDelete(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    )
  }
}
