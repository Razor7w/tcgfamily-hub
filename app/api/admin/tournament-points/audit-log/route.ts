import { NextRequest, NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import TournamentPointsAuditLog, {
  type ITournamentPointsAuditLog
} from '@/models/TournamentPointsAuditLog'

export async function GET(request: NextRequest) {
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

    const awardId = request.nextUrl.searchParams.get('awardId')?.trim()
    const limitRaw = request.nextUrl.searchParams.get('limit')
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(limitRaw ?? '40', 10) || 40)
    )

    const filter: Record<string, unknown> = { storeId: gate.activeStoreOid }
    if (awardId) {
      filter.awardId = awardId
    }

    const logs = (await TournamentPointsAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()) as unknown as (ITournamentPointsAuditLog & {
      _id: unknown
      createdAt?: Date
    })[]

    const entries = logs.map(l => ({
      id: String(l._id),
      awardId: String(l.awardId),
      eventId: l.eventId ? String(l.eventId) : null,
      eventTitle: String(l.eventTitle ?? ''),
      action: l.action,
      summary: String(l.summary ?? ''),
      changedByName: String(l.changedByName ?? 'Staff'),
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : null,
      changes: (l.changes ?? []).map(c => ({
        popId: c.popId,
        displayName: c.displayName,
        kind: c.kind,
        placeBefore: c.placeBefore,
        placeAfter: c.placeAfter,
        pointsBefore: c.pointsBefore,
        pointsAfter: c.pointsAfter,
        reason: c.reason ? String(c.reason) : undefined
      }))
    }))

    return NextResponse.json({ entries }, { status: 200 })
  } catch (error) {
    console.error('GET /api/admin/tournament-points/audit-log:', error)
    return NextResponse.json(
      { error: 'Error al cargar auditoría' },
      { status: 500 }
    )
  }
}
