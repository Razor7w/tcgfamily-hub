import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import WeeklyEvent from '@/models/WeeklyEvent'
import TournamentPointsAward from '@/models/TournamentPointsAward'

export async function GET() {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const storeId = gate.activeStoreOid.toString()
    const enabled = await isTournamentPointsEnabledForStore(storeId)
    if (!enabled) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const storeScope = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    )
    const events = await WeeklyEvent.find({
      ...storeScope,
      state: 'close',
      kind: 'tournament'
    })
      .sort({ startsAt: -1 })
      .limit(80)
      .select('title startsAt participants')
      .lean()

    const eventIds = events.map(e => e._id)
    const awards = await TournamentPointsAward.find({
      storeId: gate.activeStoreOid,
      eventId: { $in: eventIds }
    })
      .select('eventId')
      .lean()

    const awardedSet = new Set(awards.map(a => String(a.eventId)))

    const list = events.map(e => ({
      id: String(e._id),
      title: String(e.title ?? ''),
      startsAt:
        e.startsAt instanceof Date
          ? e.startsAt.toISOString()
          : new Date(e.startsAt as unknown as string).toISOString(),
      participantCount: Array.isArray(e.participants)
        ? e.participants.length
        : 0,
      hasAward: awardedSet.has(String(e._id))
    }))

    return NextResponse.json({ events: list }, { status: 200 })
  } catch (error) {
    console.error('GET /api/admin/tournament-points/finished-events:', error)
    return NextResponse.json(
      { error: 'Error al listar torneos' },
      { status: 500 }
    )
  }
}
