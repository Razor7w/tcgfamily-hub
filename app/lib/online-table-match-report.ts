import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { createMatchChatMessage, type MatchChatAccess } from '@/lib/match-chat'
import { popidForStorage } from '@/lib/rut-chile'
import { formatPersonDisplayName } from '@/lib/weekly-events'
import OnlineTableMatchReport, {
  type OnlineTableMatchReportStatus
} from '@/models/OnlineTableMatchReport'
import { syncOnlineParticipantRecords } from '@/lib/online-tournament-records'
import WeeklyEvent from '@/models/WeeklyEvent'

export const ONLINE_MATCH_AUTO_VERIFY_MS = 15_000

export type OnlineMatchReportPlayerDTO = {
  popId: string
  displayName: string
}

export type OnlineMatchReportDTO = {
  status: OnlineTableMatchReportStatus
  player1: OnlineMatchReportPlayerDTO
  player2: OnlineMatchReportPlayerDTO
  myReportedWinnerPopId: string | null
  opponentReportedWinnerPopId: string | null
  opponentReported: boolean
  winnerPopId: string | null
  winnerIsMe: boolean | null
  verifyDeadline: string | null
  verifiedAt: string | null
  canSubmit: boolean
  canStaffResolve: boolean
  isStaff: boolean
}

function claimMapToObject(
  map: Map<string, string> | Record<string, string>
): Record<string, string> {
  if (map instanceof Map) {
    return Object.fromEntries(map.entries())
  }
  return { ...(map as Record<string, string>) }
}

function getClaim(claims: Record<string, string>, pop: string): string | null {
  const v = claims[pop]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function isTablePlayerPop(
  pop: string,
  player1PopId: string,
  player2PopId: string
): boolean {
  return pop === player1PopId || pop === player2PopId
}

function evaluateClaims(args: {
  player1PopId: string
  player2PopId: string
  report1: string | null
  report2: string | null
}):
  | { kind: 'verified'; winnerPopId: string }
  | { kind: 'conflict' }
  | { kind: 'pending' } {
  const { player1PopId, player2PopId, report1, report2 } = args

  if (!report1 && !report2) return { kind: 'pending' }
  if (!report1 || !report2) return { kind: 'pending' }

  if (report1 === report2) {
    if (isTablePlayerPop(report1, player1PopId, player2PopId)) {
      return { kind: 'verified', winnerPopId: report1 }
    }
    return { kind: 'conflict' }
  }

  return { kind: 'conflict' }
}

function shouldAutoVerifySolo(args: {
  report1: string | null
  report2: string | null
  firstClaimAt: Date | null | undefined
  now: Date
}): boolean {
  const hasSolo = Boolean(
    (args.report1 && !args.report2) || (!args.report1 && args.report2)
  )
  if (!hasSolo || !args.firstClaimAt) return false
  return (
    args.now.getTime() - args.firstClaimAt.getTime() >=
    ONLINE_MATCH_AUTO_VERIFY_MS
  )
}

async function ensureReportDoc(access: Extract<MatchChatAccess, { ok: true }>) {
  let doc = await OnlineTableMatchReport.findOne({
    eventId: access.eventId,
    roundNum: access.roundNum,
    tableNumber: access.tableNumber
  })

  if (!doc) {
    doc = await OnlineTableMatchReport.create({
      eventId: access.eventId,
      roundNum: access.roundNum,
      tableNumber: access.tableNumber,
      player1PopId: access.player1PopId,
      player2PopId: access.player2PopId,
      claimByPop: new Map(),
      status: 'open'
    })
  }

  return doc
}

async function loadPlayerLabels(args: {
  eventId: mongoose.Types.ObjectId
  player1PopId: string
  player2PopId: string
}): Promise<{
  player1: OnlineMatchReportPlayerDTO
  player2: OnlineMatchReportPlayerDTO
}> {
  const ev = await WeeklyEvent.findById(args.eventId)
    .select('participants.popId participants.displayName')
    .lean<{
      participants?: { popId?: string; displayName?: string }[]
    } | null>()

  const labelFor = (popId: string) => {
    const part = ev?.participants?.find(
      p => popidForStorage(String(p.popId ?? '')) === popId
    )
    if (
      part &&
      typeof part.displayName === 'string' &&
      part.displayName.trim()
    ) {
      return formatPersonDisplayName(part.displayName)
    }
    return popId
  }

  return {
    player1: {
      popId: args.player1PopId,
      displayName: labelFor(args.player1PopId)
    },
    player2: {
      popId: args.player2PopId,
      displayName: labelFor(args.player2PopId)
    }
  }
}

async function applyVerifiedResult(args: {
  eventId: mongoose.Types.ObjectId
  winnerPopId: string
  player1PopId: string
  player2PopId: string
  roundNum: number
  tableNumber: string
  access: Extract<MatchChatAccess, { ok: true }>
  actorUserId: string
  resolvedByStaff?: boolean
}) {
  const ev = await WeeklyEvent.findById(args.eventId)
  if (!ev) return

  await syncOnlineParticipantRecords({
    eventId: args.eventId,
    doc: ev
  })
  await ev.save()

  const labels = await loadPlayerLabels({
    eventId: args.eventId,
    player1PopId: args.player1PopId,
    player2PopId: args.player2PopId
  })
  const winnerName =
    args.winnerPopId === args.player1PopId
      ? labels.player1.displayName
      : labels.player2.displayName

  const prefix = args.resolvedByStaff
    ? 'Resultado resuelto por staff'
    : 'Resultado confirmado'

  await createMatchChatMessage({
    access: args.access,
    userId: args.actorUserId,
    message: `${prefix}: victoria de ${winnerName} (ronda ${args.roundNum}, mesa ${args.tableNumber}).`,
    kind: 'system'
  })
}

async function tryFinalizeReport(args: {
  doc: Awaited<ReturnType<typeof ensureReportDoc>>
  access: Extract<MatchChatAccess, { ok: true }>
  actorUserId: string
  now: Date
  resolvedByStaff?: boolean
}) {
  const { doc, access, actorUserId, now, resolvedByStaff } = args
  if (doc.status === 'verified') return doc

  const claims = claimMapToObject(doc.claimByPop)
  const report1 = getClaim(claims, doc.player1PopId)
  const report2 = getClaim(claims, doc.player2PopId)

  let evaluation = evaluateClaims({
    player1PopId: doc.player1PopId,
    player2PopId: doc.player2PopId,
    report1,
    report2
  })

  const bothReported = Boolean(report1 && report2)
  if (
    evaluation.kind === 'pending' &&
    (report1 || report2) &&
    !bothReported &&
    shouldAutoVerifySolo({
      report1,
      report2,
      firstClaimAt: doc.firstClaimAt,
      now
    })
  ) {
    const soloWinner = report1 ?? report2!
    if (isTablePlayerPop(soloWinner, doc.player1PopId, doc.player2PopId)) {
      evaluation = { kind: 'verified', winnerPopId: soloWinner }
    }
  }

  if (evaluation.kind === 'pending') {
    doc.status = report1 || report2 ? 'verifying' : 'open'
    doc.winnerPopId = null
    doc.verifiedAt = null
    await doc.save()
    return doc
  }

  if (evaluation.kind === 'conflict') {
    doc.status = 'conflict'
    doc.winnerPopId = null
    doc.verifiedAt = null
    await doc.save()
    return doc
  }

  const updated = await OnlineTableMatchReport.findOneAndUpdate(
    { _id: doc._id, status: { $ne: 'verified' } },
    {
      $set: {
        status: 'verified',
        winnerPopId: evaluation.winnerPopId,
        verifiedAt: now
      }
    },
    { new: true }
  )

  if (!updated) {
    return (await OnlineTableMatchReport.findById(doc._id)) ?? doc
  }

  await applyVerifiedResult({
    eventId: access.eventId,
    winnerPopId: evaluation.winnerPopId,
    player1PopId: updated.player1PopId,
    player2PopId: updated.player2PopId,
    roundNum: access.roundNum,
    tableNumber: access.tableNumber,
    access,
    actorUserId,
    resolvedByStaff
  })

  return updated
}

export function serializeOnlineMatchReport(args: {
  doc: Awaited<ReturnType<typeof ensureReportDoc>>
  myPopId: string
  opponentPopId: string
  isStaff: boolean
  players: {
    player1: OnlineMatchReportPlayerDTO
    player2: OnlineMatchReportPlayerDTO
  }
  now?: Date
}): OnlineMatchReportDTO {
  const now = args.now ?? new Date()
  const claims = claimMapToObject(args.doc.claimByPop)
  const myReportedWinnerPopId = args.myPopId
    ? getClaim(claims, args.myPopId)
    : null
  const opponentReportedWinnerPopId = args.opponentPopId
    ? getClaim(claims, args.opponentPopId)
    : null

  let verifyDeadline: string | null = null
  if (
    args.doc.status === 'verifying' &&
    args.doc.firstClaimAt &&
    !(myReportedWinnerPopId && opponentReportedWinnerPopId)
  ) {
    const deadline = new Date(
      args.doc.firstClaimAt.getTime() + ONLINE_MATCH_AUTO_VERIFY_MS
    )
    if (deadline.getTime() > now.getTime()) {
      verifyDeadline = deadline.toISOString()
    }
  }

  const winnerPopId =
    args.doc.status === 'verified' && args.doc.winnerPopId
      ? args.doc.winnerPopId
      : null

  return {
    status: args.doc.status,
    player1: args.players.player1,
    player2: args.players.player2,
    myReportedWinnerPopId,
    opponentReportedWinnerPopId,
    opponentReported: Boolean(opponentReportedWinnerPopId),
    winnerPopId,
    winnerIsMe:
      winnerPopId && args.myPopId
        ? winnerPopId === args.myPopId
        : winnerPopId
          ? false
          : null,
    verifyDeadline,
    verifiedAt:
      args.doc.verifiedAt instanceof Date
        ? args.doc.verifiedAt.toISOString()
        : null,
    canSubmit:
      Boolean(args.myPopId) &&
      args.doc.status !== 'verified' &&
      args.doc.status !== 'conflict',
    canStaffResolve: args.isStaff && args.doc.status !== 'verified',
    isStaff: args.isStaff
  }
}

async function buildReportResponse(args: {
  doc: Awaited<ReturnType<typeof ensureReportDoc>>
  access: Extract<MatchChatAccess, { ok: true }>
  now: Date
}): Promise<OnlineMatchReportDTO> {
  const players = await loadPlayerLabels({
    eventId: args.access.eventId,
    player1PopId: args.doc.player1PopId,
    player2PopId: args.doc.player2PopId
  })
  return serializeOnlineMatchReport({
    doc: args.doc,
    myPopId: args.access.myPopId,
    opponentPopId: args.access.opponentPopId,
    isStaff: args.access.isStaff,
    players,
    now: args.now
  })
}

export async function getOnlineMatchReport(args: {
  access: Extract<MatchChatAccess, { ok: true }>
  userId: string
}): Promise<OnlineMatchReportDTO> {
  await connectDB()
  const now = new Date()
  const doc = await ensureReportDoc(args.access)
  await tryFinalizeReport({
    doc,
    access: args.access,
    actorUserId: args.userId,
    now
  })
  const fresh = await OnlineTableMatchReport.findById(doc._id)
  if (!fresh) {
    throw new Error('Reporte no encontrado')
  }
  return buildReportResponse({ doc: fresh, access: args.access, now })
}

export async function submitOnlineMatchWinnerReport(args: {
  access: Extract<MatchChatAccess, { ok: true }>
  userId: string
  winnerPopId: string
}): Promise<OnlineMatchReportDTO> {
  if (!args.access.myPopId) {
    throw new Error('Solo los jugadores de la mesa pueden reportar')
  }

  if (
    !isTablePlayerPop(
      args.winnerPopId,
      args.access.player1PopId,
      args.access.player2PopId
    )
  ) {
    throw new Error('Ganador inválido para esta mesa')
  }

  await connectDB()
  const now = new Date()
  const doc = await ensureReportDoc(args.access)

  if (doc.status === 'verified') {
    throw new Error('El resultado de esta mesa ya está confirmado')
  }

  if (doc.status === 'conflict') {
    throw new Error(
      'Hay conflicto entre reportes. Esperá a que el staff resuelva el resultado.'
    )
  }

  const claims = claimMapToObject(doc.claimByPop)
  const current = getClaim(claims, args.access.myPopId)
  const next = current === args.winnerPopId ? null : args.winnerPopId

  if (next) {
    doc.claimByPop.set(args.access.myPopId, next)
    if (!doc.firstClaimAt) doc.firstClaimAt = now
  } else {
    doc.claimByPop.delete(args.access.myPopId)
    if (doc.claimByPop.size === 0) doc.firstClaimAt = null
  }

  doc.markModified('claimByPop')
  await doc.save()

  await tryFinalizeReport({
    doc,
    access: args.access,
    actorUserId: args.userId,
    now
  })

  const fresh = await OnlineTableMatchReport.findById(doc._id)
  if (!fresh) {
    throw new Error('Reporte no encontrado')
  }

  return buildReportResponse({ doc: fresh, access: args.access, now })
}

export async function staffResolveOnlineMatchReport(args: {
  access: Extract<MatchChatAccess, { ok: true }>
  userId: string
  winnerPopId: string
}): Promise<OnlineMatchReportDTO> {
  if (!args.access.isStaff) {
    throw new Error('Solo el staff puede asignar el resultado')
  }

  if (
    !isTablePlayerPop(
      args.winnerPopId,
      args.access.player1PopId,
      args.access.player2PopId
    )
  ) {
    throw new Error('Ganador inválido para esta mesa')
  }

  await connectDB()
  const now = new Date()
  const doc = await ensureReportDoc(args.access)

  if (doc.status === 'verified') {
    throw new Error('El resultado de esta mesa ya está confirmado')
  }

  const updated = await OnlineTableMatchReport.findOneAndUpdate(
    { _id: doc._id, status: { $ne: 'verified' } },
    {
      $set: {
        status: 'verified',
        winnerPopId: args.winnerPopId,
        verifiedAt: now
      }
    },
    { new: true }
  )

  if (!updated) {
    throw new Error('No se pudo asignar: el estado de la mesa cambió')
  }

  await applyVerifiedResult({
    eventId: args.access.eventId,
    winnerPopId: args.winnerPopId,
    player1PopId: updated.player1PopId,
    player2PopId: updated.player2PopId,
    roundNum: args.access.roundNum,
    tableNumber: args.access.tableNumber,
    access: args.access,
    actorUserId: args.userId,
    resolvedByStaff: true
  })

  return buildReportResponse({ doc: updated, access: args.access, now })
}

export function normalizeReportedWinnerPopId(
  raw: unknown,
  player1PopId: string,
  player2PopId: string
): string | null {
  if (typeof raw !== 'string') return null
  const pop = popidForStorage(raw.trim())
  if (!pop) return null
  return isTablePlayerPop(pop, player1PopId, player2PopId) ? pop : null
}
