import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import TournamentPointsCoupon from '@/models/TournamentPointsCoupon'
import User from '@/models/User'

export const runtime = 'nodejs'

/** GET — canjes (cupones) de jugadores en la tienda activa. */
export async function GET() {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    await connectDB()
    if (
      !(await isTournamentPointsEnabledForStore(gate.activeStoreOid.toString()))
    ) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const coupons = await TournamentPointsCoupon.find({
      storeId: gate.activeStoreOid
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    const userIds = [
      ...new Set(coupons.map(c => String(c.userId)).filter(Boolean))
    ]
    const users =
      userIds.length > 0
        ? await User.find({ _id: { $in: userIds } })
            .select('name popid email')
            .lean()
        : []
    const userById = new Map(
      users.map(u => [
        String(u._id),
        {
          name:
            typeof u.name === 'string' && u.name.trim()
              ? u.name.trim()
              : 'Jugador',
          popId:
            typeof u.popid === 'string' && u.popid.trim() ? u.popid.trim() : '',
          email:
            typeof u.email === 'string' && u.email.trim() ? u.email.trim() : ''
        }
      ])
    )

    const now = Date.now()

    return NextResponse.json({
      coupons: coupons.map(c => {
        const createdAt =
          c.createdAt instanceof Date
            ? c.createdAt
            : new Date(c.createdAt as unknown as string)
        const expiresAt =
          c.expiresAt instanceof Date
            ? c.expiresAt
            : new Date(c.expiresAt as unknown as string)
        const user = userById.get(String(c.userId))
        return {
          id: String(c._id),
          code: c.code,
          points: normalizeStorePointsAmount(c.points),
          reason: c.reason,
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          expired: expiresAt.getTime() < now,
          validForHours: 24,
          userId: String(c.userId),
          userName: user?.name ?? 'Jugador',
          popId: user?.popId ?? '',
          email: user?.email ?? ''
        }
      })
    })
  } catch (error) {
    console.error('GET /api/admin/tournament-points/coupons:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar los canjes' },
      { status: 500 }
    )
  }
}
