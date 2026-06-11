import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { effectivePublicRoundNum } from '@/lib/dashboard-round-cap'
import {
  buildPopToDisplayNameMap,
  type RoundSnapshotLean,
  type RoundSnapshotPairingLean
} from '@/lib/match-rounds-with-snapshots'
import StoreMembership from '@/models/StoreMembership'
import WeeklyEvent from '@/models/WeeklyEvent'
import MatchChatMessage, {
  type IMatchChatMessage,
  type MatchChatMessageKind
} from '@/models/MatchChatMessage'
import { popidForStorage } from '@/lib/rut-chile'
import { formatPersonDisplayName } from '@/lib/weekly-events'
import { createSlidingWindowLimiter } from '@/lib/auth-rate-limit'
import { eventSupportsMatchChat } from '@/lib/tournament-mode'

export const MATCH_CHAT_MESSAGE_MAX = 500
export const MATCH_CHAT_POLL_LIMIT = 50

export type MatchChatMessageDTO = {
  id: string
  senderUserId: string | null
  senderDisplayName: string
  message: string
  kind: MatchChatMessageKind
  createdAt: string
  isSelf: boolean
}

export type MatchChatContextDTO = {
  roundNum: number
  tableNumber: string
  opponentName: string | null
  canChat: boolean
  isStaff: boolean
  reason?: string
}

type LeanParticipant = {
  userId?: unknown
  displayName?: string
  popId?: string
}

type LeanEventForChat = {
  _id: unknown
  kind: string
  state?: string
  storeId?: unknown
  tournamentMode?: string
  roundNum?: number
  roundSnapshots?: RoundSnapshotLean[]
  participants?: LeanParticipant[]
}

export const matchChatPostLimiter = createSlidingWindowLimiter({
  max: 24,
  windowMs: 60_000
})

function normalizeTableNumber(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().slice(0, 40)
  return t.length > 0 ? t : null
}

function normalizeRoundNum(raw: unknown): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim()
        ? Number(raw)
        : NaN
  if (!Number.isFinite(n)) return null
  const r = Math.round(n)
  if (r < 1 || r > 99) return null
  return r
}

export function normalizeMatchChatMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t.length) return null
  if (t.length > MATCH_CHAT_MESSAGE_MAX) return null
  return t
}

function pairingAtTable(
  snapshots: RoundSnapshotLean[],
  roundNum: number,
  tableNumber: string
) {
  const snap = snapshots.find(s => Math.round(Number(s.roundNum)) === roundNum)
  if (!snap) return null
  return (snap.pairings ?? []).find(
    p =>
      typeof p.tableNumber === 'string' &&
      p.tableNumber.trim().slice(0, 40) === tableNumber
  )
}

function userPopAtTable(
  pairing: NonNullable<ReturnType<typeof pairingAtTable>>,
  myPop: string
): boolean {
  const p1 = popidForStorage(
    typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
  )
  const p2 = popidForStorage(
    typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
  )
  return myPop === p1 || myPop === p2
}

async function isStaffForEventStore(
  userId: string,
  storeId: unknown
): Promise<boolean> {
  if (storeId == null || !mongoose.Types.ObjectId.isValid(String(storeId))) {
    return false
  }
  await connectDB()
  const storeOid = new mongoose.Types.ObjectId(String(storeId))
  const uid = new mongoose.Types.ObjectId(userId)
  const m = await StoreMembership.findOne({
    storeId: storeOid,
    userId: uid,
    role: { $in: ['owner', 'store_admin'] }
  })
    .select('_id')
    .lean()
  return Boolean(m)
}

function opponentNameFromPairing(
  pairing: RoundSnapshotPairingLean,
  myPop: string,
  popToDisplayName: Map<string, string>
): { name: string; isBye: boolean } | null {
  const p1 = popidForStorage(
    typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
  )
  const p2 = popidForStorage(
    typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
  )

  if (p1 === myPop) {
    if (pairing.isBye || !p2) return { name: 'Bye', isBye: true }
    const fromPairing =
      typeof pairing.player2Name === 'string' ? pairing.player2Name.trim() : ''
    if (fromPairing)
      return { name: formatPersonDisplayName(fromPairing), isBye: false }
    const fromPop = p2 ? popToDisplayName.get(p2) : undefined
    if (fromPop) return { name: fromPop, isBye: false }
    return p2 ? { name: p2, isBye: false } : null
  }

  if (p2 === myPop) {
    const fromPairing =
      typeof pairing.player1Name === 'string' ? pairing.player1Name.trim() : ''
    if (fromPairing)
      return { name: formatPersonDisplayName(fromPairing), isBye: false }
    const fromPop = p1 ? popToDisplayName.get(p1) : undefined
    if (fromPop) return { name: fromPop, isBye: false }
    return p1 ? { name: p1, isBye: false } : null
  }

  return null
}

export function findUserPairingInRound(args: {
  myPop: string
  roundNum: number
  snapshots: RoundSnapshotLean[]
  participants: LeanParticipant[]
}): {
  tableNumber: string
  opponentName: string | null
  isBye: boolean
} | null {
  const myPop = popidForStorage(args.myPop)
  if (!myPop) return null
  const snap = args.snapshots.find(
    s => Math.round(Number(s.roundNum)) === args.roundNum
  )
  if (!snap) return null
  const popToDisplayName = buildPopToDisplayNameMap(args.participants)
  for (const pairing of snap.pairings ?? []) {
    const tableNumber =
      typeof pairing.tableNumber === 'string'
        ? pairing.tableNumber.trim().slice(0, 40)
        : ''
    if (!tableNumber) continue
    const p1 = popidForStorage(
      typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
    )
    const p2 = popidForStorage(
      typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
    )
    if (p1 !== myPop && p2 !== myPop) continue
    if (pairing.isBye || !p2) {
      return { tableNumber, opponentName: null, isBye: true }
    }
    const opp = opponentNameFromPairing(pairing, myPop, popToDisplayName)
    return {
      tableNumber,
      opponentName: opp?.name ?? null,
      isBye: false
    }
  }
  return null
}

export type MatchChatAccess =
  | {
      ok: true
      eventId: mongoose.Types.ObjectId
      roundNum: number
      tableNumber: string
      isStaff: boolean
      senderDisplayName: string
      myPopId: string
      opponentPopId: string
      player1PopId: string
      player2PopId: string
    }
  | { ok: false; status: number; error: string }

export async function resolveMatchChatAccess(args: {
  eventId: string
  userId: string
  roundNumRaw: unknown
  tableNumberRaw: unknown
}): Promise<MatchChatAccess> {
  const roundNum = normalizeRoundNum(args.roundNumRaw)
  const tableNumber = normalizeTableNumber(args.tableNumberRaw)
  if (!roundNum || !tableNumber) {
    return { ok: false, status: 400, error: 'Ronda o mesa inválida' }
  }

  if (!mongoose.Types.ObjectId.isValid(args.eventId.trim())) {
    return { ok: false, status: 400, error: 'Evento inválido' }
  }

  await connectDB()
  const eventOid = new mongoose.Types.ObjectId(args.eventId.trim())

  const doc = await WeeklyEvent.findById(eventOid)
    .select(
      'kind state storeId tournamentMode roundNum roundSnapshots participants.userId participants.displayName participants.popId'
    )
    .lean<LeanEventForChat | null>()

  if (!doc) {
    return { ok: false, status: 404, error: 'Evento no encontrado' }
  }

  if (doc.kind !== 'tournament') {
    return { ok: false, status: 400, error: 'Solo aplica a torneos' }
  }

  if (!eventSupportsMatchChat(doc.tournamentMode)) {
    return {
      ok: false,
      status: 403,
      error: 'El chat solo está disponible en torneos online'
    }
  }

  if (doc.state !== 'running') {
    return {
      ok: false,
      status: 403,
      error: 'El chat solo está disponible mientras el torneo está en curso'
    }
  }

  const publicRound = effectivePublicRoundNum(doc.roundNum)
  if (roundNum !== publicRound) {
    return {
      ok: false,
      status: 403,
      error: 'Solo puedes chatear en la ronda en curso'
    }
  }

  const pairing = pairingAtTable(
    doc.roundSnapshots ?? [],
    roundNum,
    tableNumber
  )
  if (!pairing) {
    return {
      ok: false,
      status: 404,
      error: 'No hay emparejamiento publicado para esta mesa'
    }
  }

  if (pairing.isBye) {
    return {
      ok: false,
      status: 403,
      error: 'No hay chat en mesas con bye'
    }
  }

  const participants = doc.participants ?? []
  const mine = participants.find(
    p => p.userId && String(p.userId) === args.userId
  )
  const staff = await isStaffForEventStore(args.userId, doc.storeId)

  const p1 = popidForStorage(
    typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
  )
  const p2 = popidForStorage(
    typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
  )

  if (mine) {
    const myPop = popidForStorage(
      typeof mine.popId === 'string' ? mine.popId : ''
    )
    if (myPop && userPopAtTable(pairing, myPop)) {
      const displayName =
        typeof mine.displayName === 'string' && mine.displayName.trim()
          ? formatPersonDisplayName(mine.displayName)
          : 'Jugador'
      const opponentPopId = myPop === p1 ? p2 : p1

      return {
        ok: true,
        eventId: eventOid,
        roundNum,
        tableNumber,
        isStaff: staff,
        senderDisplayName: displayName,
        myPopId: myPop,
        opponentPopId,
        player1PopId: p1,
        player2PopId: p2
      }
    }
  }

  if (staff) {
    const name =
      typeof mine?.displayName === 'string' && mine.displayName.trim()
        ? formatPersonDisplayName(mine.displayName)
        : 'Staff'
    return {
      ok: true,
      eventId: eventOid,
      roundNum,
      tableNumber,
      isStaff: true,
      senderDisplayName: name,
      myPopId: '',
      opponentPopId: '',
      player1PopId: p1,
      player2PopId: p2
    }
  }

  if (!mine) {
    return {
      ok: false,
      status: 403,
      error: 'Debes estar inscrito en este torneo'
    }
  }

  return {
    ok: false,
    status: 403,
    error: 'No tienes acceso al chat de esta mesa'
  }
}

export async function buildMatchChatContext(args: {
  eventId: string
  userId: string
}): Promise<
  | { ok: true; context: MatchChatContextDTO }
  | { ok: false; status: number; error: string }
> {
  if (!mongoose.Types.ObjectId.isValid(args.eventId.trim())) {
    return { ok: false, status: 400, error: 'Evento inválido' }
  }

  await connectDB()
  const eventOid = new mongoose.Types.ObjectId(args.eventId.trim())

  const doc = await WeeklyEvent.findById(eventOid)
    .select(
      'kind state storeId tournamentMode roundNum roundSnapshots participants.userId participants.displayName participants.popId'
    )
    .lean<LeanEventForChat | null>()

  if (!doc) {
    return { ok: false, status: 404, error: 'Evento no encontrado' }
  }

  if (doc.kind !== 'tournament') {
    return { ok: false, status: 400, error: 'Solo aplica a torneos' }
  }

  const online = eventSupportsMatchChat(doc.tournamentMode)
  const staff = await isStaffForEventStore(args.userId, doc.storeId)
  const roundNum = effectivePublicRoundNum(doc.roundNum)

  if (!online) {
    return {
      ok: true,
      context: {
        roundNum,
        tableNumber: '',
        opponentName: null,
        canChat: false,
        isStaff: staff,
        reason: 'El chat solo está disponible en torneos online'
      }
    }
  }

  if (doc.state !== 'running' || roundNum < 1) {
    return {
      ok: true,
      context: {
        roundNum,
        tableNumber: '',
        opponentName: null,
        canChat: false,
        isStaff: staff,
        reason:
          doc.state !== 'running'
            ? 'El torneo no está en curso'
            : 'Aún no hay ronda activa'
      }
    }
  }

  const participants = doc.participants ?? []
  const mine = participants.find(
    p => p.userId && String(p.userId) === args.userId
  )

  if (!staff && !mine) {
    return {
      ok: false,
      status: 403,
      error: 'Debes estar inscrito en este torneo'
    }
  }

  if (staff && !mine) {
    return {
      ok: true,
      context: {
        roundNum,
        tableNumber: '',
        opponentName: null,
        canChat: false,
        isStaff: true,
        reason: 'Selecciona una mesa para ver el chat (staff)'
      }
    }
  }

  const myPop = popidForStorage(
    typeof mine?.popId === 'string' ? mine.popId : ''
  )
  const hit = findUserPairingInRound({
    myPop,
    roundNum,
    snapshots: doc.roundSnapshots ?? [],
    participants
  })

  if (!hit) {
    return {
      ok: true,
      context: {
        roundNum,
        tableNumber: '',
        opponentName: null,
        canChat: false,
        isStaff: staff,
        reason: 'Tu emparejamiento aún no está publicado para esta ronda'
      }
    }
  }

  if (hit.isBye) {
    return {
      ok: true,
      context: {
        roundNum,
        tableNumber: hit.tableNumber,
        opponentName: null,
        canChat: false,
        isStaff: staff,
        reason: 'Tienes bye esta ronda'
      }
    }
  }

  return {
    ok: true,
    context: {
      roundNum,
      tableNumber: hit.tableNumber,
      opponentName: hit.opponentName,
      canChat: true,
      isStaff: staff
    }
  }
}

export function serializeMatchChatMessage(
  doc: Pick<
    IMatchChatMessage,
    | '_id'
    | 'senderUserId'
    | 'senderDisplayName'
    | 'message'
    | 'kind'
    | 'createdAt'
  >,
  viewerUserId: string
): MatchChatMessageDTO {
  const senderId = doc.senderUserId != null ? String(doc.senderUserId) : null
  return {
    id: String(doc._id),
    senderUserId: senderId,
    senderDisplayName: doc.senderDisplayName,
    message: doc.message,
    kind: doc.kind,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    isSelf: senderId != null && senderId === viewerUserId
  }
}

export async function listMatchChatMessages(args: {
  eventId: mongoose.Types.ObjectId
  roundNum: number
  tableNumber: string
  sinceId?: string | null
  sinceAt?: Date | null
  limit?: number
  viewerUserId: string
}): Promise<MatchChatMessageDTO[]> {
  const limit = Math.min(
    MATCH_CHAT_POLL_LIMIT,
    Math.max(1, args.limit ?? MATCH_CHAT_POLL_LIMIT)
  )

  const filter: Record<string, unknown> = {
    eventId: args.eventId,
    roundNum: args.roundNum,
    tableNumber: args.tableNumber
  }

  if (args.sinceId && mongoose.Types.ObjectId.isValid(args.sinceId)) {
    filter._id = { $gt: new mongoose.Types.ObjectId(args.sinceId) }
  } else if (
    args.sinceAt instanceof Date &&
    !Number.isNaN(args.sinceAt.getTime())
  ) {
    filter.createdAt = { $gt: args.sinceAt }
  }

  const rows = await MatchChatMessage.find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit)
    .lean<
      Pick<
        IMatchChatMessage,
        | '_id'
        | 'senderUserId'
        | 'senderDisplayName'
        | 'message'
        | 'kind'
        | 'createdAt'
      >[]
    >()

  return rows.map(r => serializeMatchChatMessage(r, args.viewerUserId))
}

export async function createMatchChatMessage(args: {
  access: Extract<MatchChatAccess, { ok: true }>
  userId: string
  message: string
  kind?: MatchChatMessageKind
  senderDisplayName?: string
}): Promise<MatchChatMessageDTO> {
  const kind = args.kind ?? 'user'
  const doc = await MatchChatMessage.create({
    eventId: args.access.eventId,
    roundNum: args.access.roundNum,
    tableNumber: args.access.tableNumber,
    senderUserId:
      kind === 'user' ? new mongoose.Types.ObjectId(args.userId) : undefined,
    senderDisplayName:
      args.senderDisplayName ??
      (kind === 'system' ? 'Torneo' : args.access.senderDisplayName),
    message: args.message,
    kind
  })

  return serializeMatchChatMessage(doc, args.userId)
}

export function parseSinceCursor(
  sinceId: string | null,
  sinceIso: string | null
): { sinceId: string | null; sinceAt: Date | null } {
  if (sinceId?.trim() && mongoose.Types.ObjectId.isValid(sinceId.trim())) {
    return { sinceId: sinceId.trim(), sinceAt: null }
  }
  if (sinceIso?.trim()) {
    const d = new Date(sinceIso.trim())
    if (!Number.isNaN(d.getTime())) {
      return { sinceId: null, sinceAt: d }
    }
  }
  return { sinceId: null, sinceAt: null }
}
