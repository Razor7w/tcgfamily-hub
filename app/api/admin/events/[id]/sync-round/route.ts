import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import WeeklyEvent from '@/models/WeeklyEvent'
import type {
  IRoundPairingSnapshot,
  IRoundSnapshot
} from '@/models/WeeklyEvent'
import { popidForStorage } from '@/lib/rut-chile'

const ROUND_NUM_MAX = 9999
const NAME_MAX = 200
const MAX_PAIRINGS = 512
const WLT_MAX = 999

type MatchInput = {
  tableNumber?: string
  player1PopId?: string
  player2PopId?: string
}

type ParticipantRecordInput = {
  popId?: string
  wins?: unknown
  losses?: unknown
  ties?: unknown
}

function clampWlt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(WLT_MAX, Math.round(n)))
}

function trimStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

type PairingSnapshotInput = {
  tableNumber?: unknown
  player1PopId?: unknown
  player2PopId?: unknown
  player1Name?: unknown
  player2Name?: unknown
  player1Record?: { wins?: unknown; losses?: unknown; ties?: unknown }
  player2Record?: { wins?: unknown; losses?: unknown; ties?: unknown }
  isBye?: unknown
}

function sanitizePairingSnapshot(
  p: PairingSnapshotInput
): IRoundPairingSnapshot {
  const isBye = Boolean(p.isBye)
  return {
    tableNumber: trimStr(p.tableNumber, 40),
    player1PopId: trimStr(p.player1PopId, 32),
    player2PopId: trimStr(p.player2PopId, 32),
    player1Name: trimStr(p.player1Name, NAME_MAX),
    player2Name: trimStr(p.player2Name, NAME_MAX),
    player1Record: {
      wins: clampWlt(p.player1Record?.wins),
      losses: clampWlt(p.player1Record?.losses),
      ties: clampWlt(p.player1Record?.ties)
    },
    player2Record: {
      wins: clampWlt(p.player2Record?.wins),
      losses: clampWlt(p.player2Record?.losses),
      ties: clampWlt(p.player2Record?.ties)
    },
    isBye
  }
}

function pairingsFromMatchesOnly(rows: MatchInput[]): IRoundPairingSnapshot[] {
  return rows.slice(0, MAX_PAIRINGS).map(row => {
    const p1 = typeof row.player1PopId === 'string' ? row.player1PopId : ''
    const p2 = typeof row.player2PopId === 'string' ? row.player2PopId : ''
    const isBye = Boolean(p1 && !p2.trim())
    return {
      tableNumber: String(row.tableNumber ?? '')
        .trim()
        .slice(0, 40),
      player1PopId: p1.trim().slice(0, 32),
      player2PopId: p2.trim().slice(0, 32),
      player1Name: '',
      player2Name: isBye ? '' : '',
      player1Record: { wins: 0, losses: 0, ties: 0 },
      player2Record: { wins: 0, losses: 0, ties: 0 },
      isBye
    }
  })
}

/**
 * POST — Fija la ronda actual del evento y aplica mesa + oponente (por POP ID) según el TDF.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: eventId } = await context.params
    if (!eventId?.trim()) {
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

    const rawRound = rec.roundNum
    let roundNum = 0
    if (typeof rawRound === 'number' && Number.isFinite(rawRound)) {
      roundNum = Math.round(rawRound)
    } else if (typeof rawRound === 'string' && rawRound.trim() !== '') {
      const n = Number(rawRound)
      if (Number.isFinite(n)) roundNum = Math.round(n)
    }
    if (roundNum < 0 || roundNum > ROUND_NUM_MAX) {
      return NextResponse.json(
        { error: 'Número de ronda inválido' },
        { status: 400 }
      )
    }

    const rawMatches = rec.matches
    if (!Array.isArray(rawMatches)) {
      return NextResponse.json(
        { error: 'Se requiere matches (array)' },
        { status: 400 }
      )
    }

    await connectDB()

    const doc = await WeeklyEvent.findById(eventId.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc)
    if (forbidden) return forbidden

    doc.roundNum = roundNum
    doc.state = 'running'

    type Sub = mongoose.Types.Subdocument & {
      popId?: string
      table?: string
      opponentId?: string
      wins?: number
      losses?: number
      ties?: number
      _id: mongoose.Types.ObjectId
    }

    const participants = doc.participants as unknown as Sub[]

    function findByPop(popRaw: string): Sub | undefined {
      const n = popidForStorage(popRaw)
      if (!n) return undefined
      return participants.find(
        p => popidForStorage(typeof p.popId === 'string' ? p.popId : '') === n
      )
    }

    let applied = 0
    const skipped: { tableNumber: string; reason: string }[] = []

    for (const row of rawMatches as MatchInput[]) {
      const tableStr = String(row.tableNumber ?? '').trim()
      const p1Raw = typeof row.player1PopId === 'string' ? row.player1PopId : ''
      const p2Raw = typeof row.player2PopId === 'string' ? row.player2PopId : ''
      const n1 = popidForStorage(p1Raw)
      const n2 = popidForStorage(p2Raw)

      if (!n1 && !n2) {
        skipped.push({
          tableNumber: tableStr || '—',
          reason: 'Sin POP en ambos jugadores'
        })
        continue
      }

      if (n1 && !n2) {
        const part1 = findByPop(p1Raw)
        if (!part1) {
          skipped.push({
            tableNumber: tableStr || '—',
            reason: `POP ${n1} no está en el listado del evento`
          })
          continue
        }
        part1.table = tableStr
        part1.opponentId = ''
        applied++
        continue
      }

      if (!n1 && n2) {
        const part2 = findByPop(p2Raw)
        if (!part2) {
          skipped.push({
            tableNumber: tableStr || '—',
            reason: `POP ${n2} no está en el listado del evento`
          })
          continue
        }
        part2.table = tableStr
        part2.opponentId = ''
        applied++
        continue
      }

      const part1 = findByPop(p1Raw)
      const part2 = findByPop(p2Raw)

      if (!part1 || !part2) {
        skipped.push({
          tableNumber: tableStr || '—',
          reason: !part1
            ? `POP ${n1} no está en el listado`
            : `POP ${n2} no está en el listado`
        })
        continue
      }

      if (String(part1._id) === String(part2._id)) {
        skipped.push({
          tableNumber: tableStr || '—',
          reason: 'Mismo participante'
        })
        continue
      }

      const id1 = String(part1._id)
      const id2 = String(part2._id)

      part1.table = tableStr
      part1.opponentId = id2
      part2.table = tableStr
      part2.opponentId = id1
      applied++
    }

    const rawRecords = rec.participantRecords
    let recordsApplied = 0
    if (Array.isArray(rawRecords)) {
      for (const row of rawRecords as ParticipantRecordInput[]) {
        const popRaw = typeof row.popId === 'string' ? row.popId : ''
        if (!popRaw.trim()) continue
        const part = findByPop(popRaw)
        if (!part) continue
        part.wins = clampWlt(row.wins)
        part.losses = clampWlt(row.losses)
        part.ties = clampWlt(row.ties)
        recordsApplied++
      }
    }

    const snapRec = rec.roundSnapshot
    let pairingsSnapshot: IRoundPairingSnapshot[]
    if (
      typeof snapRec === 'object' &&
      snapRec !== null &&
      Array.isArray((snapRec as Record<string, unknown>).pairings)
    ) {
      const rawList = (snapRec as { pairings: PairingSnapshotInput[] }).pairings
      pairingsSnapshot = rawList
        .slice(0, MAX_PAIRINGS)
        .map(row => sanitizePairingSnapshot(row))
    } else {
      pairingsSnapshot = pairingsFromMatchesOnly(rawMatches as MatchInput[])
    }

    const snapshot: IRoundSnapshot = {
      roundNum,
      syncedAt: new Date(),
      pairings: pairingsSnapshot,
      skipped: skipped.map(s => ({
        tableNumber: s.tableNumber.slice(0, 40),
        reason: s.reason.slice(0, 500)
      }))
    }

    const prev = [...(doc.roundSnapshots ?? [])].filter(
      r => (r as IRoundSnapshot).roundNum !== roundNum
    )
    doc.roundSnapshots = [...prev, snapshot] as typeof doc.roundSnapshots

    doc.markModified('participants')
    doc.markModified('roundSnapshots')
    await doc.save()

    return NextResponse.json(
      {
        ok: true,
        roundNum: doc.roundNum,
        state: doc.state,
        appliedMatches: applied,
        recordsApplied,
        skipped,
        participantCount: doc.participants.length,
        roundSnapshotsCount: doc.roundSnapshots?.length ?? 0
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('POST /api/admin/events/[id]/sync-round:', error)
    return NextResponse.json(
      { error: 'Error al setear la ronda' },
      { status: 500 }
    )
  }
}
