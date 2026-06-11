import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { popidForStorage } from '@/lib/rut-chile'
import { formatPersonDisplayName } from '@/lib/weekly-events'
import { eventSupportsMatchChat } from '@/lib/tournament-mode'
import {
  buildOnlineRoundTimerForRound,
  type OnlineRoundTimerPayload
} from '@/lib/online-round-timer'
import {
  getOnlineRound1LaunchStatus,
  getOnlineRoundAdvanceStatus,
  type OnlineRound1LaunchStatus,
  type OnlineRoundAdvanceStatus
} from '@/lib/online-tournament-advance-round'
import OnlineTableMatchReport, {
  type OnlineTableMatchReportStatus
} from '@/models/OnlineTableMatchReport'
import WeeklyEvent from '@/models/WeeklyEvent'

export type AdminOnlineTableReportRow = {
  roundNum: number
  tableNumber: string
  status: OnlineTableMatchReportStatus
  player1: { popId: string; displayName: string }
  player2: { popId: string; displayName: string }
  player1ReportedWinnerPopId: string | null
  player2ReportedWinnerPopId: string | null
  winnerPopId: string | null
  verifiedAt: string | null
  updatedAt: string | null
}

export type AdminOnlineTableReportsSummary = {
  eventId: string
  tournamentMode: string
  roundNum: number
  reports: AdminOnlineTableReportRow[]
  conflictCount: number
  conflictsByRound: { roundNum: number; count: number }[]
  advanceStatus: OnlineRoundAdvanceStatus
  launchRound1Status: OnlineRound1LaunchStatus
  roundTimer: OnlineRoundTimerPayload | null
  timerContext: {
    state: string
    onlineRoundTimeMinutes: number
    roundSnapshots: { roundNum: number; syncedAt: string }[]
  }
}

function claimMapToObject(
  map: Map<string, string> | Record<string, string>
): Record<string, string> {
  if (map instanceof Map) {
    return Object.fromEntries(map.entries())
  }
  return { ...(map as Record<string, string>) }
}

function displayNameForPop(
  popId: string,
  participants: { popId?: string; displayName?: string }[]
): string {
  const part = participants.find(
    p => popidForStorage(String(p.popId ?? '')) === popId
  )
  if (part && typeof part.displayName === 'string' && part.displayName.trim()) {
    return formatPersonDisplayName(part.displayName)
  }
  return popId
}

function pairingLabel(
  snapshots: {
    roundNum?: number
    pairings?: {
      tableNumber?: string
      player1PopId?: string
      player2PopId?: string
      player1Name?: string
      player2Name?: string
    }[]
  }[],
  roundNum: number,
  tableNumber: string,
  slot: 1 | 2
): { popId: string; displayName: string } | null {
  const snap = snapshots.find(s => Math.round(Number(s.roundNum)) === roundNum)
  const row = snap?.pairings?.find(
    p =>
      typeof p.tableNumber === 'string' &&
      p.tableNumber.trim() === tableNumber.trim()
  )
  if (!row) return null
  const pop =
    slot === 1
      ? popidForStorage(String(row.player1PopId ?? ''))
      : popidForStorage(String(row.player2PopId ?? ''))
  if (!pop) return null
  const name =
    slot === 1
      ? typeof row.player1Name === 'string'
        ? row.player1Name.trim()
        : ''
      : typeof row.player2Name === 'string'
        ? row.player2Name.trim()
        : ''
  return { popId: pop, displayName: name || pop }
}

export async function listAdminOnlineTableReports(args: {
  eventId: string
  statusFilter?: OnlineTableMatchReportStatus | 'all'
}): Promise<AdminOnlineTableReportsSummary> {
  if (!mongoose.Types.ObjectId.isValid(args.eventId.trim())) {
    throw new Error('Evento inválido')
  }

  await connectDB()
  const eventOid = new mongoose.Types.ObjectId(args.eventId.trim())

  const ev = await WeeklyEvent.findById(eventOid)
    .select(
      'tournamentMode state onlineRoundTimeMinutes roundNum roundSnapshots participants.popId participants.displayName'
    )
    .lean<{
      tournamentMode?: string
      state?: string
      onlineRoundTimeMinutes?: number
      roundNum?: number
      roundSnapshots?: {
        roundNum?: number
        syncedAt?: Date | string
        pairings?: {
          tableNumber?: string
          player1PopId?: string
          player2PopId?: string
          player1Name?: string
          player2Name?: string
          isBye?: boolean
        }[]
      }[]
      participants?: { popId?: string; displayName?: string }[]
    } | null>()

  if (!ev) {
    throw new Error('Evento no encontrado')
  }

  if (!eventSupportsMatchChat(ev.tournamentMode)) {
    throw new Error('Solo aplica a torneos online')
  }

  const participants = ev.participants ?? []
  const snapshots = ev.roundSnapshots ?? []

  const docs = await OnlineTableMatchReport.find({ eventId: eventOid })
    .sort({ roundNum: 1, tableNumber: 1 })
    .lean()

  const docByKey = new Map(
    docs.map(d => [`${d.roundNum}:${d.tableNumber}`, d] as const)
  )

  type PairingRow = {
    roundNum: number
    tableNumber: string
    player1PopId: string
    player2PopId: string
    player1Name: string
    player2Name: string
  }

  const pairingRows: PairingRow[] = []
  for (const snap of snapshots) {
    const roundNum = Math.round(Number(snap.roundNum) || 0)
    if (roundNum < 1) continue
    for (const p of snap.pairings ?? []) {
      const tableNumber =
        typeof p.tableNumber === 'string' ? p.tableNumber.trim() : ''
      if (p.isBye) continue
      const p1 = popidForStorage(String(p.player1PopId ?? ''))
      if (!tableNumber || !p1) continue
      const p2 = popidForStorage(String(p.player2PopId ?? ''))
      if (!p2) continue
      pairingRows.push({
        roundNum,
        tableNumber,
        player1PopId: p1,
        player2PopId: p2,
        player1Name:
          typeof p.player1Name === 'string' ? p.player1Name.trim() : '',
        player2Name:
          typeof p.player2Name === 'string' ? p.player2Name.trim() : ''
      })
    }
  }

  const buildRow = (
    roundNum: number,
    tableNumber: string,
    player1: { popId: string; displayName: string },
    player2: { popId: string; displayName: string },
    doc: (typeof docs)[number] | undefined
  ): AdminOnlineTableReportRow => {
    const claims = doc ? claimMapToObject(doc.claimByPop) : {}
    const p1Pop = doc?.player1PopId ?? player1.popId
    const p2Pop = doc?.player2PopId ?? player2.popId
    const status = doc?.status ?? 'open'
    return {
      roundNum,
      tableNumber,
      status,
      player1,
      player2,
      player1ReportedWinnerPopId: claims[p1Pop] ?? null,
      player2ReportedWinnerPopId: claims[p2Pop] ?? null,
      winnerPopId:
        status === 'verified' && doc?.winnerPopId ? doc.winnerPopId : null,
      verifiedAt:
        doc?.verifiedAt instanceof Date ? doc.verifiedAt.toISOString() : null,
      updatedAt:
        doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null
    }
  }

  const reportsFromPairings: AdminOnlineTableReportRow[] = pairingRows.map(
    pr => {
      const doc = docByKey.get(`${pr.roundNum}:${pr.tableNumber}`)
      const player1 = {
        popId: pr.player1PopId,
        displayName:
          pr.player1Name || displayNameForPop(pr.player1PopId, participants)
      }
      const player2 = {
        popId: pr.player2PopId,
        displayName:
          pr.player2Name || displayNameForPop(pr.player2PopId, participants)
      }
      return buildRow(pr.roundNum, pr.tableNumber, player1, player2, doc)
    }
  )

  const pairingKeys = new Set(
    pairingRows.map(p => `${p.roundNum}:${p.tableNumber}`)
  )

  const orphanDocs = docs.filter(
    d => !pairingKeys.has(`${d.roundNum}:${d.tableNumber}`)
  )

  const reportsFromOrphans: AdminOnlineTableReportRow[] = orphanDocs.map(
    doc => {
      const p1FromPairing = pairingLabel(
        snapshots,
        doc.roundNum,
        doc.tableNumber,
        1
      )
      const p2FromPairing = pairingLabel(
        snapshots,
        doc.roundNum,
        doc.tableNumber,
        2
      )

      const player1 = p1FromPairing ?? {
        popId: doc.player1PopId,
        displayName: displayNameForPop(doc.player1PopId, participants)
      }
      const player2 = p2FromPairing ?? {
        popId: doc.player2PopId,
        displayName: displayNameForPop(doc.player2PopId, participants)
      }

      return buildRow(doc.roundNum, doc.tableNumber, player1, player2, doc)
    }
  )

  const allReports = [...reportsFromPairings, ...reportsFromOrphans].sort(
    (a, b) =>
      a.roundNum - b.roundNum ||
      a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
  )

  const conflictRows = allReports.filter(r => r.status === 'conflict')

  let reports = allReports
  if (args.statusFilter && args.statusFilter !== 'all') {
    reports = allReports.filter(r => r.status === args.statusFilter)
  }
  const byRound = new Map<number, number>()
  for (const r of conflictRows) {
    byRound.set(r.roundNum, (byRound.get(r.roundNum) ?? 0) + 1)
  }

  const roundNum = Math.max(0, Math.round(Number(ev.roundNum) || 0))
  const [advanceStatus, launchRound1Status] = await Promise.all([
    getOnlineRoundAdvanceStatus({ eventId: eventOid, roundNum }),
    getOnlineRound1LaunchStatus({ eventId: eventOid })
  ])

  const roundTimer = buildOnlineRoundTimerForRound({
    tournamentMode: ev.tournamentMode,
    state: ev.state,
    onlineRoundTimeMinutes: ev.onlineRoundTimeMinutes,
    roundSnapshots: snapshots,
    roundNum
  })

  const timerContext = {
    state:
      ev.state === 'running' || ev.state === 'close' ? ev.state : 'schedule',
    onlineRoundTimeMinutes: Math.max(
      0,
      Math.round(Number(ev.onlineRoundTimeMinutes) || 0)
    ),
    roundSnapshots: snapshots
      .map(s => ({
        roundNum: Math.max(0, Math.round(Number(s.roundNum) || 0)),
        syncedAt:
          s.syncedAt instanceof Date
            ? s.syncedAt.toISOString()
            : typeof s.syncedAt === 'string'
              ? s.syncedAt
              : ''
      }))
      .filter(s => s.roundNum > 0 && s.syncedAt)
  }

  return {
    eventId: args.eventId.trim(),
    tournamentMode: ev.tournamentMode ?? 'online',
    roundNum,
    reports,
    conflictCount: conflictRows.length,
    conflictsByRound: [...byRound.entries()]
      .map(([roundNum, count]) => ({ roundNum, count }))
      .sort((a, b) => a.roundNum - b.roundNum),
    advanceStatus,
    launchRound1Status,
    roundTimer,
    timerContext
  }
}
