import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { isTournamentPointsEnabledForStore } from '@/lib/tournament-points-settings'
import { weeklyOfficialByIdForStaffGate } from '@/lib/multitenancy/staff-queries'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import {
  computeTournamentPointsDistribution,
  defaultTopCount
} from '@/lib/tournament-points-distribution'
import { rankPlayersForTournamentPoints } from '@/lib/tournament-points-ranking'
import {
  applyAwardRowCreditDeltas,
  diffAwardRows,
  parseAwardRowsInput,
  resolveUserIdsForAwardRows,
  rowsToSnapshot,
  staffDisplayName,
  writeTournamentPointsAuditLog
} from '@/lib/tournament-points-admin'
import TournamentPointsAward, {
  type ITournamentPointsAward
} from '@/models/TournamentPointsAward'
import type { ITournamentCategoryStandings } from '@/models/WeeklyEvent'

function buildProposal(
  ranked: ReturnType<typeof rankPlayersForTournamentPoints>,
  topCount: number,
  pointOverrides?: number[]
) {
  const playerCount = ranked.length
  const top = Math.max(1, Math.min(topCount, playerCount))
  const distribution =
    pointOverrides && pointOverrides.length === top
      ? pointOverrides
      : computeTournamentPointsDistribution(playerCount, top)

  const rows = ranked.slice(0, top).map((p, i) => ({
    place: i + 1,
    displayName: p.displayName,
    popId: p.popId,
    userId: p.userId,
    wins: p.wins,
    losses: p.losses,
    ties: p.ties,
    points: Math.max(0, Math.round(Number(distribution[i]) || 0))
  }))

  return {
    playerCount,
    topCount: top,
    defaultTopCount: defaultTopCount(playerCount),
    distributionTotal: rows.reduce((s, r) => s + r.points, 0),
    rows
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    if (
      !(await isTournamentPointsEnabledForStore(gate.activeStoreOid.toString()))
    ) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const doc = await weeklyOfficialByIdForStaffGate(gate, id.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc)
    if (forbidden) return forbidden
    if (doc.state !== 'close') {
      return NextResponse.json(
        { error: 'El torneo debe estar cerrado' },
        { status: 400 }
      )
    }

    const ranked = rankPlayersForTournamentPoints({
      participants: doc.participants ?? [],
      tournamentStandings: doc.tournamentStandings as
        | ITournamentCategoryStandings[]
        | undefined
    })

    const existing = (await TournamentPointsAward.findOne({
      storeId: gate.activeStoreOid,
      eventId: doc._id
    }).lean()) as ITournamentPointsAward | null

    const topParam = request.nextUrl.searchParams.get('topCount')
    let topCount = existing?.topCount ?? defaultTopCount(ranked.length)
    if (topParam) {
      const n = Number.parseInt(topParam, 10)
      if (Number.isFinite(n) && n >= 1) {
        topCount = Math.min(n, ranked.length)
      }
    }
    const proposal = buildProposal(ranked, topCount)
    const rankedAll = ranked.map(p => ({
      displayName: p.displayName,
      popId: p.popId,
      userId: p.userId,
      wins: p.wins,
      losses: p.losses,
      ties: p.ties,
      standingPlace: p.standingPlace
    }))

    return NextResponse.json(
      {
        event: {
          id: String(doc._id),
          title: doc.title,
          startsAt:
            doc.startsAt instanceof Date
              ? doc.startsAt.toISOString()
              : new Date(doc.startsAt).toISOString()
        },
        rankedAll,
        proposal,
        existingAward: existing
          ? {
              topCount: existing.topCount,
              playerCount: existing.playerCount,
              rows: existing.rows,
              createdAt: (() => {
                const ca = (existing as unknown as { createdAt?: Date })
                  .createdAt
                return ca instanceof Date ? ca.toISOString() : null
              })()
            }
          : null
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/admin/tournament-points/events/[id]:', error)
    return NextResponse.json(
      { error: 'Error al cargar propuesta' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
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

    const rawRows = rec.rows
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere rows (array con al menos un jugador)' },
        { status: 400 }
      )
    }

    await connectDB()
    if (
      !(await isTournamentPointsEnabledForStore(gate.activeStoreOid.toString()))
    ) {
      return NextResponse.json(
        { error: 'Puntos por torneo no está habilitado en esta tienda' },
        { status: 403 }
      )
    }

    const doc = await weeklyOfficialByIdForStaffGate(gate, id.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc)
    if (forbidden) return forbidden
    if (doc.state !== 'close') {
      return NextResponse.json(
        { error: 'El torneo debe estar cerrado' },
        { status: 400 }
      )
    }

    const prior = await TournamentPointsAward.findOne({
      storeId: gate.activeStoreOid,
      eventId: doc._id
    })
    if (prior) {
      return NextResponse.json(
        {
          error:
            'Este torneo ya tiene puntos asignados. Edítalos en «Gestión y auditoría» más abajo.'
        },
        { status: 409 }
      )
    }

    const ranked = rankPlayersForTournamentPoints({
      participants: doc.participants ?? [],
      tournamentStandings: doc.tournamentStandings as
        | ITournamentCategoryStandings[]
        | undefined
    })
    const playerCount = ranked.length

    const rows = parseAwardRowsInput(rawRows)
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay filas válidas para guardar' },
        { status: 400 }
      )
    }

    const popToUser = await resolveUserIdsForAwardRows(rows)
    for (const row of rows) {
      if (!row.userId) {
        const uid = popToUser.get(row.popId)
        if (uid) row.userId = uid
      }
    }

    const popsMissingUser = rows.filter(r => !r.userId && r.points > 0)
    const { adjustments: credited, skippedNoUser } =
      await applyAwardRowCreditDeltas(
        [],
        rows,
        popToUser,
        gate.activeStoreOid,
        gate.primaryStoreOid ?? null
      )

    const topCount = rows.length
    const staffOid =
      gate.session.user?.id &&
      mongoose.Types.ObjectId.isValid(gate.session.user.id)
        ? new mongoose.Types.ObjectId(gate.session.user.id)
        : undefined
    const changedByName = await staffDisplayName(staffOid)

    const award = await TournamentPointsAward.create({
      storeId: gate.activeStoreOid,
      eventId: doc._id,
      eventTitle: String(doc.title ?? '').slice(0, 300),
      playerCount,
      topCount,
      rows: rowsToSnapshot(rows),
      createdByUserId: staffOid
    })

    const changes = diffAwardRows([], rows)
    await writeTournamentPointsAuditLog({
      storeId: gate.activeStoreOid,
      awardId: award._id as mongoose.Types.ObjectId,
      eventId: doc._id as mongoose.Types.ObjectId,
      eventTitle: String(doc.title ?? '').slice(0, 300),
      action: 'created',
      changedByUserId: staffOid,
      changedByName,
      changes
    })

    return NextResponse.json(
      {
        ok: true,
        playerCount,
        topCount,
        pointsTotal: rows.reduce((s, r) => s + r.points, 0),
        credited,
        skippedNoUser,
        popsMissingUser: popsMissingUser.length,
        awardId: String(award._id)
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('POST /api/admin/tournament-points/events/[id]:', error)
    return NextResponse.json(
      { error: 'Error al guardar puntos' },
      { status: 500 }
    )
  }
}
