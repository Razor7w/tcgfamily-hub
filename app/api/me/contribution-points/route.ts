import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildMyContributionPointsSummary } from '@/lib/contribution-points/build-summary'
import { isContributionPointsEnabledForStore } from '@/lib/contribution-points/settings'
import type { MyContributionPointsData } from '@/lib/contribution-points-public'
import mongoose from 'mongoose'

export async function GET() {
  try {
    const session = await auth()
    const uid = session?.user?.id
    const activeStoreId = (
      session?.user as { activeStoreId?: string } | undefined
    )?.activeStoreId

    if (!uid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (
      !activeStoreId ||
      !mongoose.Types.ObjectId.isValid(activeStoreId.trim())
    ) {
      return NextResponse.json(
        { error: 'Selecciona una tienda activa' },
        { status: 400 }
      )
    }

    await connectDB()
    const enabled = await isContributionPointsEnabledForStore(
      activeStoreId.trim()
    )
    const storeOid = new mongoose.Types.ObjectId(activeStoreId.trim())
    const userOid = new mongoose.Types.ObjectId(uid)

    const summary = await buildMyContributionPointsSummary({
      storeId: storeOid,
      userId: userOid,
      enabled
    })

    const payload: MyContributionPointsData = {
      enabled: summary.enabled,
      totalPoints: summary.totalPoints,
      monthPoints: summary.monthPoints,
      monthLabel: summary.monthLabel,
      byCategory: summary.byCategory,
      tier: summary.tier,
      recentEntries: summary.recentEntries
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error('GET /api/me/contribution-points:', error)
    return NextResponse.json(
      { error: 'Error al cargar puntos de contribución' },
      { status: 500 }
    )
  }
}
