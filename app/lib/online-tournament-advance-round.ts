import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { buildOnlineTournamentStandings } from '@/lib/build-online-tournament-standings'
import { syncOnlineParticipantRecords } from '@/lib/online-tournament-records'
import { applyTournamentParticipationAwardsOnEventClose } from '@/lib/contribution-points/tournament-contribution-awards'
import { popidForStorage } from '@/lib/rut-chile'
import { formatPersonDisplayName } from '@/lib/weekly-events'
import { eventSupportsMatchChat } from '@/lib/tournament-mode'
import {
  generateSwissPairings,
  type SwissPairingResult,
  type SwissPlayer
} from '@/lib/swiss-pairing'
import OnlineTableMatchReport from '@/models/OnlineTableMatchReport'
import WeeklyEvent, {
  type IRoundPairingSnapshot,
  type IRoundSnapshot
} from '@/models/WeeklyEvent'

export type OnlineRoundAdvanceStatus = {
  currentRoundNum: number
  nextRoundNum: number
  totalTables: number
  verifiedTables: number
  conflictTables: number
  pendingTables: number
  canAdvanceRound: boolean
  blockReason: string | null
  canCloseTournament: boolean
  closeBlockReason: string | null
}

export type OnlineRound1LaunchStatus = {
  /** Confirmados con POP ID (entran al emparejamiento). */
  eligiblePlayers: number
  /** Preinscritos con POP aún sin confirmar asistencia. */
  preregisteredWithPop: number
  canLaunchRound1: boolean
  blockReason: string | null
}

type ParticipantSub = mongoose.Types.Subdocument & {
  popId?: string
  displayName?: string
  confirmed?: boolean
  wins?: number
  losses?: number
  ties?: number
  table?: string
  opponentId?: string
  _id: mongoose.Types.ObjectId
}

function popIdFromParticipant(p: { popId?: string }): string {
  return popidForStorage(typeof p.popId === 'string' ? p.popId : '')
}

function isConfirmedWithPop(p: {
  popId?: string
  confirmed?: boolean
}): boolean {
  return Boolean(p.confirmed) && popIdFromParticipant(p).length > 0
}

function countOnlineTournamentPlayerBuckets(
  participants: { popId?: string; confirmed?: boolean }[]
): { eligiblePlayers: number; preregisteredWithPop: number } {
  let eligiblePlayers = 0
  let preregisteredWithPop = 0
  for (const p of participants) {
    const pop = popIdFromParticipant(p)
    if (!pop) continue
    if (p.confirmed) eligiblePlayers++
    else preregisteredWithPop++
  }
  return { eligiblePlayers, preregisteredWithPop }
}

function pairingRowsForRound(
  snapshots: IRoundSnapshot[],
  roundNum: number
): IRoundPairingSnapshot[] {
  const snap = snapshots.find(s => Math.round(Number(s.roundNum)) === roundNum)
  return snap?.pairings ?? []
}

function participantsToSwissPlayers(
  participants: ParticipantSub[],
  options?: { confirmedOnly?: boolean }
): SwissPlayer[] {
  return participants
    .filter(p => !options?.confirmedOnly || isConfirmedWithPop(p))
    .map(p => {
      const popId = popIdFromParticipant(p)
      if (!popId) return null
      const displayName =
        typeof p.displayName === 'string' && p.displayName.trim()
          ? formatPersonDisplayName(p.displayName)
          : popId
      return {
        popId,
        displayName,
        wins: Math.max(0, Math.round(Number(p.wins) || 0)),
        losses: Math.max(0, Math.round(Number(p.losses) || 0)),
        ties: Math.max(0, Math.round(Number(p.ties) || 0))
      }
    })
    .filter((p): p is SwissPlayer => p !== null)
}

function publishOnlineRoundPairings(args: {
  doc: mongoose.Document & {
    participants: unknown
    roundSnapshots?: IRoundSnapshot[]
    roundNum?: number
    state?: string
    markModified: (path: string) => void
    save: () => Promise<unknown>
  }
  generated: SwissPairingResult[]
  roundNum: number
}): void {
  const participants = args.doc.participants as unknown as ParticipantSub[]

  const findByPop = (popRaw: string): ParticipantSub | undefined => {
    const n = popidForStorage(popRaw)
    if (!n) return undefined
    return participants.find(
      p => popidForStorage(typeof p.popId === 'string' ? p.popId : '') === n
    )
  }

  for (const p of participants) {
    p.table = ''
    p.opponentId = ''
  }

  for (const row of args.generated) {
    if (row.isBye || !row.player2PopId) {
      const part1 = findByPop(row.player1PopId)
      if (part1) {
        part1.table = row.tableNumber
        part1.opponentId = ''
      }
      continue
    }

    const part1 = findByPop(row.player1PopId)
    const part2 = findByPop(row.player2PopId)
    if (part1 && part2) {
      part1.table = row.tableNumber
      part1.opponentId = String(part2._id)
      part2.table = row.tableNumber
      part2.opponentId = String(part1._id)
    }
  }

  const snapshot: IRoundSnapshot = {
    roundNum: args.roundNum,
    syncedAt: new Date(),
    pairings: args.generated,
    skipped: []
  }

  const prev = [...(args.doc.roundSnapshots ?? [])].filter(
    r => Math.round(Number(r.roundNum)) !== args.roundNum
  )
  args.doc.roundSnapshots = [
    ...prev,
    snapshot
  ] as typeof args.doc.roundSnapshots
  args.doc.roundNum = args.roundNum
  args.doc.state = 'running'
  args.doc.markModified('participants')
  args.doc.markModified('roundSnapshots')
}

export async function getOnlineRound1LaunchStatus(args: {
  eventId: mongoose.Types.ObjectId
}): Promise<OnlineRound1LaunchStatus> {
  const ev = await WeeklyEvent.findById(args.eventId)
    .select(
      'state roundNum roundSnapshots tournamentMode participants.popId participants.confirmed'
    )
    .lean<{
      state?: string
      roundNum?: number
      roundSnapshots?: IRoundSnapshot[]
      tournamentMode?: string
      participants?: { popId?: string; confirmed?: boolean }[]
    } | null>()

  const { eligiblePlayers, preregisteredWithPop } =
    countOnlineTournamentPlayerBuckets(ev?.participants ?? [])

  let canLaunchRound1 = false
  let blockReason: string | null = null

  if (!ev || !eventSupportsMatchChat(ev.tournamentMode)) {
    blockReason = 'Solo aplica a torneos online'
  } else if (ev.state === 'close') {
    blockReason = 'El torneo ya está cerrado'
  } else if (
    (ev.roundSnapshots ?? []).some(s => Math.round(Number(s.roundNum)) === 1)
  ) {
    blockReason = 'La ronda 1 ya está publicada'
  } else if (Math.max(0, Math.round(Number(ev.roundNum) || 0)) >= 1) {
    blockReason = 'La ronda 1 ya está publicada'
  } else if (eligiblePlayers < 1) {
    blockReason =
      preregisteredWithPop > 0
        ? 'Confirmá asistencia en la pestaña Asistencia antes de lanzar la ronda 1'
        : 'Agregá al menos un jugador confirmado con POP ID'
  } else if (ev.state !== 'schedule' && ev.state !== 'running') {
    blockReason = 'El torneo debe estar programado o en curso'
  } else {
    canLaunchRound1 = true
  }

  return {
    eligiblePlayers,
    preregisteredWithPop,
    canLaunchRound1,
    blockReason
  }
}

export async function launchOnlineTournamentRound1(args: {
  eventId: string
}): Promise<{
  roundNum: number
  pairingsCount: number
  launchStatus: OnlineRound1LaunchStatus
  advanceStatus: OnlineRoundAdvanceStatus
}> {
  if (!mongoose.Types.ObjectId.isValid(args.eventId.trim())) {
    throw new Error('Evento inválido')
  }

  await connectDB()
  const eventOid = new mongoose.Types.ObjectId(args.eventId.trim())

  const doc = await WeeklyEvent.findById(eventOid)
  if (!doc) {
    throw new Error('Evento no encontrado')
  }

  if (!eventSupportsMatchChat(doc.tournamentMode)) {
    throw new Error('Solo aplica a torneos online')
  }

  const launchStatus = await getOnlineRound1LaunchStatus({ eventId: eventOid })
  if (!launchStatus.canLaunchRound1) {
    throw new Error(launchStatus.blockReason ?? 'No se puede lanzar la ronda 1')
  }

  const participants = doc.participants as unknown as ParticipantSub[]
  await syncOnlineParticipantRecords({
    eventId: eventOid,
    doc
  })
  const swissPlayers = participantsToSwissPlayers(participants, {
    confirmedOnly: true
  })
  const generated = generateSwissPairings({
    players: swissPlayers,
    roundNum: 1,
    previousPairings: []
  })

  if (generated.length === 0) {
    throw new Error('No se pudieron generar emparejamientos')
  }

  publishOnlineRoundPairings({ doc, generated, roundNum: 1 })
  await syncOnlineParticipantRecords({
    eventId: eventOid,
    doc
  })
  await doc.save()

  const advanceStatus = await getOnlineRoundAdvanceStatus({
    eventId: eventOid,
    roundNum: 1
  })

  return {
    roundNum: 1,
    pairingsCount: generated.length,
    launchStatus: await getOnlineRound1LaunchStatus({ eventId: eventOid }),
    advanceStatus
  }
}

export async function getOnlineRoundAdvanceStatus(args: {
  eventId: mongoose.Types.ObjectId
  roundNum?: number
}): Promise<OnlineRoundAdvanceStatus> {
  const ev = await WeeklyEvent.findById(args.eventId)
    .select('roundSnapshots roundNum state tournamentMode')
    .lean<{
      roundSnapshots?: IRoundSnapshot[]
      roundNum?: number
      state?: string
      tournamentMode?: string
    } | null>()

  const currentRoundNum =
    args.roundNum && args.roundNum > 0
      ? args.roundNum
      : Math.max(0, Math.round(Number(ev?.roundNum) || 0))

  const reports = await OnlineTableMatchReport.find({
    eventId: args.eventId,
    roundNum: currentRoundNum
  }).lean()

  const reportByTable = new Map(
    reports.map(r => [r.tableNumber.trim(), r] as const)
  )
  const nextRoundNum = currentRoundNum + 1
  const rows = pairingRowsForRound(ev?.roundSnapshots ?? [], currentRoundNum)

  let totalTables = 0
  let verifiedTables = 0
  let conflictTables = 0
  let pendingTables = 0

  for (const row of rows) {
    const table = row.tableNumber.trim()
    if (!table) continue
    totalTables++
    if (row.isBye || !row.player2PopId?.trim()) {
      verifiedTables++
      continue
    }
    const rep = reportByTable.get(table)
    if (!rep) {
      pendingTables++
      continue
    }
    if (rep.status === 'verified') verifiedTables++
    else if (rep.status === 'conflict') conflictTables++
    else pendingTables++
  }

  const tablesReady =
    totalTables > 0 &&
    conflictTables === 0 &&
    pendingTables === 0 &&
    verifiedTables >= totalTables

  let canAdvanceRound = false
  let blockReason: string | null = null
  let canCloseTournament = false
  let closeBlockReason: string | null = null

  if (!ev || !eventSupportsMatchChat(ev.tournamentMode)) {
    blockReason = 'Solo aplica a torneos online'
    closeBlockReason = blockReason
  } else if (ev.state === 'close') {
    closeBlockReason = 'El torneo ya está cerrado'
    blockReason = 'El torneo ya está cerrado'
  } else if (ev.state !== 'running') {
    blockReason = 'El torneo debe estar en curso'
    closeBlockReason = blockReason
  } else if (currentRoundNum < 1) {
    blockReason = 'Aún no hay ronda publicada'
    closeBlockReason = blockReason
  } else if (totalTables === 0) {
    blockReason = 'No hay mesas en la ronda actual'
    closeBlockReason = blockReason
  } else if (conflictTables > 0) {
    blockReason = `Hay ${conflictTables} mesa(s) en conflicto`
    closeBlockReason = blockReason
  } else if (pendingTables > 0) {
    blockReason = `Faltan ${pendingTables} mesa(s) por confirmar`
    closeBlockReason = blockReason
  } else if (verifiedTables < totalTables) {
    blockReason = 'No todas las mesas están confirmadas'
    closeBlockReason = blockReason
  } else if (
    (ev.roundSnapshots ?? []).some(
      s => Math.round(Number(s.roundNum)) === nextRoundNum
    )
  ) {
    blockReason = `La ronda ${nextRoundNum} ya está publicada`
    if (tablesReady) {
      canCloseTournament = true
    } else {
      closeBlockReason = blockReason
    }
  } else {
    canAdvanceRound = true
    canCloseTournament = true
  }

  return {
    currentRoundNum,
    nextRoundNum,
    totalTables,
    verifiedTables,
    conflictTables,
    pendingTables,
    canAdvanceRound,
    blockReason,
    canCloseTournament,
    closeBlockReason
  }
}

export async function advanceOnlineTournamentRound(args: {
  eventId: string
}): Promise<{
  roundNum: number
  pairingsCount: number
  advanceStatus: OnlineRoundAdvanceStatus
}> {
  if (!mongoose.Types.ObjectId.isValid(args.eventId.trim())) {
    throw new Error('Evento inválido')
  }

  await connectDB()
  const eventOid = new mongoose.Types.ObjectId(args.eventId.trim())

  const doc = await WeeklyEvent.findById(eventOid)
  if (!doc) {
    throw new Error('Evento no encontrado')
  }

  if (!eventSupportsMatchChat(doc.tournamentMode)) {
    throw new Error('Solo aplica a torneos online')
  }

  if (doc.state !== 'running') {
    throw new Error('El torneo debe estar en curso')
  }

  const currentRoundNum = Math.max(0, Math.round(Number(doc.roundNum) || 0))
  if (currentRoundNum < 1) {
    throw new Error('Publicá la ronda 1 antes de avanzar')
  }

  const advanceStatus = await getOnlineRoundAdvanceStatus({
    eventId: eventOid,
    roundNum: currentRoundNum
  })

  if (!advanceStatus.canAdvanceRound) {
    throw new Error(advanceStatus.blockReason ?? 'No se puede avanzar de ronda')
  }

  const nextRoundNum = advanceStatus.nextRoundNum
  const participants = doc.participants as unknown as ParticipantSub[]
  await syncOnlineParticipantRecords({
    eventId: eventOid,
    doc
  })
  const swissPlayers = participantsToSwissPlayers(participants, {
    confirmedOnly: true
  })

  const previousPairings = (doc.roundSnapshots ?? []).flatMap(s =>
    (s.pairings ?? []).map(p => ({
      player1PopId: popidForStorage(
        typeof p.player1PopId === 'string' ? p.player1PopId : ''
      ),
      player2PopId: popidForStorage(
        typeof p.player2PopId === 'string' ? p.player2PopId : ''
      ),
      isBye: p.isBye
    }))
  )

  const generated = generateSwissPairings({
    players: swissPlayers,
    roundNum: nextRoundNum,
    previousPairings
  })

  if (generated.length === 0) {
    throw new Error('No se pudieron generar emparejamientos')
  }

  publishOnlineRoundPairings({ doc, generated, roundNum: nextRoundNum })
  await syncOnlineParticipantRecords({
    eventId: eventOid,
    doc
  })
  await doc.save()

  const freshStatus = await getOnlineRoundAdvanceStatus({
    eventId: eventOid,
    roundNum: nextRoundNum
  })

  return {
    roundNum: nextRoundNum,
    pairingsCount: generated.length,
    advanceStatus: freshStatus
  }
}

export async function finalizeOnlineTournament(args: {
  eventId: string
  storeId?: mongoose.Types.ObjectId | string | null
}): Promise<{
  state: 'close'
  advanceStatus: OnlineRoundAdvanceStatus
  tournamentStandingsCategories: number
}> {
  if (!mongoose.Types.ObjectId.isValid(args.eventId.trim())) {
    throw new Error('Evento inválido')
  }

  await connectDB()
  const eventOid = new mongoose.Types.ObjectId(args.eventId.trim())

  const doc = await WeeklyEvent.findById(eventOid)
  if (!doc) {
    throw new Error('Evento no encontrado')
  }

  if (!eventSupportsMatchChat(doc.tournamentMode)) {
    throw new Error('Solo aplica a torneos online')
  }

  if (doc.state === 'close') {
    throw new Error('El torneo ya está cerrado')
  }

  if (doc.state !== 'running') {
    throw new Error('El torneo debe estar en curso')
  }

  const currentRoundNum = Math.max(0, Math.round(Number(doc.roundNum) || 0))
  const advanceStatus = await getOnlineRoundAdvanceStatus({
    eventId: eventOid,
    roundNum: currentRoundNum
  })

  if (!advanceStatus.canCloseTournament) {
    throw new Error(
      advanceStatus.closeBlockReason ?? 'No se puede finalizar el torneo'
    )
  }

  await syncOnlineParticipantRecords({
    eventId: eventOid,
    doc
  })

  const standings = await buildOnlineTournamentStandings({
    eventId: eventOid,
    participants: doc.participants,
    roundSnapshots: doc.roundSnapshots ?? []
  })

  doc.tournamentStandings = standings as typeof doc.tournamentStandings
  doc.state = 'close'
  doc.markModified('tournamentStandings')
  await doc.save()

  await applyTournamentParticipationAwardsOnEventClose(
    doc,
    args.storeId ?? null
  )

  const freshStatus = await getOnlineRoundAdvanceStatus({
    eventId: eventOid,
    roundNum: currentRoundNum
  })

  return {
    state: 'close',
    advanceStatus: freshStatus,
    tournamentStandingsCategories: standings.length
  }
}
