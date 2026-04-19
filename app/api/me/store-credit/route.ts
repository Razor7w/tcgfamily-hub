import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await connectDB()
    let userId: mongoose.Types.ObjectId
    try {
      userId = new mongoose.Types.ObjectId(session.user.id)
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 400 })
    }

    const user = await User.findById(userId)
      .select('storePoints storePointsExpiringNext storePointsExpiryDate')
      .lean()

    if (!user || Array.isArray(user)) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const u = user as {
      storePoints?: number
      storePointsExpiringNext?: number
      storePointsExpiryDate?: Date
    }

    return NextResponse.json({
      storePoints: u.storePoints ?? 0,
      storePointsExpiringNext: u.storePointsExpiringNext ?? 0,
      storePointsExpiryDate: u.storePointsExpiryDate
        ? new Date(u.storePointsExpiryDate).toISOString()
        : null
    })
  } catch (error) {
    console.error('store-credit:', error)
    return NextResponse.json(
      { error: 'Error al obtener el crédito' },
      { status: 500 }
    )
  }
}
