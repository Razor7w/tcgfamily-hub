import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import { aggregateTournamentPointsByPlayer } from '@/lib/tournament-points-admin'
import TournamentPointsAward, {
  type ITournamentPointsAward
} from '@/models/TournamentPointsAward'
import WeeklyEvent from '@/models/WeeklyEvent'

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

    const awards = (await TournamentPointsAward.find({
      storeId: gate.activeStoreOid
    })
      .sort({ createdAt: -1 })
      .limit(120)
      .lean()) as unknown as (ITournamentPointsAward & {
      _id: unknown
      createdAt?: Date
      updatedAt?: Date
    })[]

    const eventIds = awards.map(a => a.eventId)
    const eventMeta = new Map<
      string,
      { startsAt: string | null; title: string }
    >()
    if (eventIds.length > 0) {
      const events = await WeeklyEvent.find({ _id: { $in: eventIds } })
        .select('startsAt title')
        .lean()
      for (const ev of events) {
        eventMeta.set(String(ev._id), {
          startsAt:
            ev.startsAt instanceof Date
              ? ev.startsAt.toISOString()
              : new Date(ev.startsAt as unknown as string).toISOString(),
          title: String(ev.title ?? '')
        })
      }
    }

    const list = awards.map(a => {
      const eid = String(a.eventId)
      const meta = eventMeta.get(eid)
      const rows = a.rows ?? []
      return {
        id: String(a._id),
        eventId: eid,
        eventTitle: a.eventTitle || meta?.title || 'Torneo',
        startsAt: meta?.startsAt ?? null,
        playerCount: a.playerCount,
        topCount: a.topCount,
        pointsTotal: rows.reduce((s, r) => s + (r.points ?? 0), 0),
        rowCount: rows.length,
        awardedAt:
          (a as { createdAt?: Date }).createdAt instanceof Date
            ? (a as { createdAt: Date }).createdAt.toISOString()
            : null,
        updatedAt:
          (a as { updatedAt?: Date }).updatedAt instanceof Date
            ? (a as { updatedAt: Date }).updatedAt.toISOString()
            : null,
        rows: rows.map(r => ({
          place: r.place,
          displayName: r.displayName,
          popId: r.popId,
          userId: r.userId ? String(r.userId) : null,
          points: r.points
        }))
      }
    })

    const flatRows = list.flatMap(award =>
      award.rows
        .filter(row => (row.points ?? 0) > 0)
        .map(row => ({
          awardId: award.id,
          eventTitle: award.eventTitle,
          awardedAt: award.awardedAt,
          popId: row.popId,
          userId: row.userId,
          displayName: row.displayName,
          points: row.points
        }))
    )

    const players = await aggregateTournamentPointsByPlayer(flatRows)

    return NextResponse.json({ awards: list, players }, { status: 200 })
  } catch (error) {
    console.error('GET /api/admin/tournament-points/awards:', error)
    return NextResponse.json(
      { error: 'Error al listar asignaciones' },
      { status: 500 }
    )
  }
}
