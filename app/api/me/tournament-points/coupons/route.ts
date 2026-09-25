import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import {
  createTournamentPointsCouponForUser,
  TOURNAMENT_POINTS_COUPON_REASON_MAX
} from '@/lib/tournament-points-coupon'
import TournamentPointsCoupon from '@/models/TournamentPointsCoupon'

export const runtime = 'nodejs'

/** GET — cupones recientes del usuario en la tienda activa. */
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
    const enabled = await isTournamentPointsEnabledForStore(
      activeStoreId.trim()
    )
    if (!enabled) {
      return NextResponse.json({ enabled: false, coupons: [] }, { status: 200 })
    }

    const storeOid = new mongoose.Types.ObjectId(activeStoreId.trim())
    const userOid = new mongoose.Types.ObjectId(uid)
    const coupons = await TournamentPointsCoupon.find({
      storeId: storeOid,
      userId: userOid
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({
      enabled: true,
      coupons: coupons.map(c => ({
        id: String(c._id),
        code: c.code,
        points: normalizeStorePointsAmount(c.points),
        reason: c.reason,
        createdAt:
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : new Date(c.createdAt as unknown as string).toISOString(),
        expiresAt:
          c.expiresAt instanceof Date
            ? c.expiresAt.toISOString()
            : new Date(c.expiresAt as unknown as string).toISOString(),
        validForHours: 24
      }))
    })
  } catch (error) {
    console.error('GET /api/me/tournament-points/coupons:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar los cupones' },
      { status: 500 }
    )
  }
}

/** POST — genera cupón y descuenta puntos (múltiplos de 0.5). */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const uid = session?.user?.id
    const activeStoreId = (
      session?.user as { activeStoreId?: string } | undefined
    )?.activeStoreId

    if (!uid || !mongoose.Types.ObjectId.isValid(uid)) {
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }
    const rec =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}

    const points = normalizeStorePointsAmount(rec.points)
    const reason =
      typeof rec.reason === 'string'
        ? rec.reason.slice(0, TOURNAMENT_POINTS_COUPON_REASON_MAX)
        : ''

    await connectDB()
    if (!(await isTournamentPointsEnabledForStore(activeStoreId.trim()))) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const storeOid = new mongoose.Types.ObjectId(activeStoreId.trim())
    const displayName =
      typeof session.user?.name === 'string' && session.user.name.trim()
        ? session.user.name.trim()
        : 'Jugador'

    const coupon = await createTournamentPointsCouponForUser({
      storeOid,
      userId: uid,
      points,
      reason,
      userDisplayName: displayName
    })

    return NextResponse.json({ ok: true, coupon }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo generar el cupón'
    const status =
      message.includes('múltiplos') ||
      message.includes('razón') ||
      message.includes('saldo') ||
      message.includes('motivo') ||
      message.includes('descontar')
        ? 400
        : 500
    if (status === 500) {
      console.error('POST /api/me/tournament-points/coupons:', error)
    }
    return NextResponse.json({ error: message }, { status })
  }
}
