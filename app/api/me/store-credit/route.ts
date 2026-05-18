import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUserWithActiveStore } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import {
  isoOrNull,
  resolveStoreWalletForUser,
  type LeanUserWallet
} from '@/lib/store-credit-resolve'

export async function GET() {
  try {
    const gate = await requireSessionUserWithActiveStore()
    if (!gate.ok) return gate.response

    let userOid: mongoose.Types.ObjectId
    try {
      userOid = new mongoose.Types.ObjectId(gate.session.user.id)
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 400 })
    }

    await connectDB()
    const [user, primary] = await Promise.all([
      User.findById(userOid)
        .select(
          'storePoints storePointsExpiringNext storePointsExpiryDate storeCredits'
        )
        .lean(),
      memoPrimaryTcgfamilyStoreObjectId()
    ])

    if (!user || Array.isArray(user)) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }
    const w = resolveStoreWalletForUser(
      user as LeanUserWallet,
      gate.activeStoreOid,
      primary
    )

    return NextResponse.json({
      storePoints: w.storePoints,
      storePointsExpiringNext: w.storePointsExpiringNext,
      storePointsExpiryDate: isoOrNull(w.storePointsExpiryDate)
    })
  } catch (error) {
    console.error('store-credit:', error)
    return NextResponse.json(
      { error: 'Error al obtener el crédito' },
      { status: 500 }
    )
  }
}
