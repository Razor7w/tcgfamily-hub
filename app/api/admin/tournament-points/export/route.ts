import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  buildTournamentPointsCsv,
  tournamentPointsCsvFilename,
  type TournamentPointsExportLine
} from '@/lib/tournament-points-csv'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import TournamentPointsAward, {
  type ITournamentPointsAward
} from '@/models/TournamentPointsAward'
import WeeklyEvent from '@/models/WeeklyEvent'

/** GET — CSV de todas las asignaciones de puntos de torneo de la tienda activa. */
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
      .sort({ awardedAt: 1, createdAt: 1 })
      .lean()) as unknown as (ITournamentPointsAward & {
      _id: unknown
      createdAt?: Date
      awardedAt?: Date
    })[]

    const eventIds = awards
      .map(a => a.eventId)
      .filter((id): id is NonNullable<typeof id> => id != null)
    const eventMeta = new Map<
      string,
      { startsAt: Date | null; title: string }
    >()
    if (eventIds.length > 0) {
      const events = await WeeklyEvent.find({ _id: { $in: eventIds } })
        .select('startsAt title')
        .lean()
      for (const ev of events) {
        const starts =
          ev.startsAt instanceof Date
            ? ev.startsAt
            : new Date(ev.startsAt as unknown as string)
        eventMeta.set(String(ev._id), {
          startsAt: Number.isNaN(starts.getTime()) ? null : starts,
          title: String(ev.title ?? '')
        })
      }
    }

    const lines: TournamentPointsExportLine[] = []
    for (const award of awards) {
      const eventId = award.eventId ? String(award.eventId) : ''
      const meta = eventId ? eventMeta.get(eventId) : undefined
      const awardedAt =
        award.awardedAt instanceof Date
          ? award.awardedAt
          : (meta?.startsAt ??
            (award.createdAt instanceof Date ? award.createdAt : null))
      for (const row of award.rows ?? []) {
        lines.push({
          eventId,
          eventTitle: award.eventTitle || meta?.title || 'Torneo',
          awardedAt,
          popId: row.popId,
          displayName: row.displayName,
          place: row.place,
          points: row.points
        })
      }
    }

    const csv = buildTournamentPointsCsv(lines)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${tournamentPointsCsvFilename()}"`,
        'X-Tournament-Points-Export-Count': String(lines.length),
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('GET /api/admin/tournament-points/export:', error)
    return NextResponse.json(
      { error: 'No se pudo exportar los puntos' },
      { status: 500 }
    )
  }
}
