import mongoose from 'mongoose'
import User from '@/models/User'
import TournamentPointsAuditLog, {
  type ITournamentPointsAuditChange,
  type TournamentPointsAuditAction
} from '@/models/TournamentPointsAuditLog'
import type { ITournamentPointsAwardRow } from '@/models/TournamentPointsAward'
import TournamentPointsAward from '@/models/TournamentPointsAward'
import TournamentPointsListExclusion from '@/models/TournamentPointsListExclusion'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import { incrementStoreCreditPoints } from '@/lib/store-credit-slice-write'
import { popidForStorage } from '@/lib/rut-chile'

const MAX_ROWS = 64
const POINTS_MAX = 99_999
const PLACE_MAX = 9999
const REASON_MIN = 3
const REASON_MAX = 500

export type PointDeduction = {
  popId: string
  subtract: number
  reason: string
}

export type PointAddition = {
  popId: string
  add: number
  reason: string
}

/** Torneo sintético para sumas manuales sin fila previa en otro award. */
export const MANUAL_TOURNAMENT_POINTS_GROUP_KEY = 'manual:staff-adjustments'

export type ParsedAwardRow = {
  place: number
  displayName: string
  popId: string
  userId?: mongoose.Types.ObjectId
  points: number
}

export function parseAwardRowsInput(raw: unknown[]): ParsedAwardRow[] {
  const rows: ParsedAwardRow[] = []
  for (const row of raw.slice(0, MAX_ROWS)) {
    if (typeof row !== 'object' || row === null) continue
    const r = row as Record<string, unknown>
    const popId = popidForStorage(
      typeof r.popId === 'string' ? r.popId : String(r.popId ?? '')
    )
    if (!popId) continue
    const place = Math.max(
      1,
      Math.min(PLACE_MAX, Math.round(Number(r.place) || 0))
    )
    const points = Math.max(
      0,
      Math.min(POINTS_MAX, Math.round(Number(r.points) || 0))
    )
    const displayName =
      typeof r.displayName === 'string' && r.displayName.trim()
        ? r.displayName.trim().slice(0, 200)
        : popId
    let userId: mongoose.Types.ObjectId | undefined
    if (
      typeof r.userId === 'string' &&
      mongoose.Types.ObjectId.isValid(r.userId)
    ) {
      userId = new mongoose.Types.ObjectId(r.userId)
    }
    rows.push({ place, displayName, popId, userId, points })
  }
  rows.sort((a, b) => a.place - b.place)
  return rows
}

export async function resolveUserIdsForAwardRows(
  rows: ParsedAwardRow[]
): Promise<Map<string, mongoose.Types.ObjectId>> {
  const popIds = [...new Set(rows.map(r => r.popId))]
  const users = await User.find({ popid: { $in: popIds } })
    .select('_id popid')
    .lean()
  const map = new Map<string, mongoose.Types.ObjectId>()
  for (const u of users) {
    const pop = popidForStorage(String((u as { popid?: string }).popid ?? ''))
    if (pop) map.set(pop, (u as { _id: mongoose.Types.ObjectId })._id)
  }
  return map
}

export function rowsToSnapshot(
  rows: ParsedAwardRow[]
): ITournamentPointsAwardRow[] {
  return rows.map(r => ({
    place: r.place,
    displayName: r.displayName,
    popId: r.popId,
    userId: r.userId,
    points: r.points
  }))
}

export function diffAwardRows(
  before: ParsedAwardRow[],
  after: ParsedAwardRow[]
): ITournamentPointsAuditChange[] {
  const beforeMap = new Map(before.map(r => [r.popId, r]))
  const afterMap = new Map(after.map(r => [r.popId, r]))
  const changes: ITournamentPointsAuditChange[] = []

  for (const [popId, a] of afterMap) {
    const b = beforeMap.get(popId)
    if (!b) {
      changes.push({
        popId,
        displayName: a.displayName,
        placeAfter: a.place,
        pointsAfter: a.points,
        kind: 'added'
      })
      continue
    }
    if (
      b.place !== a.place ||
      b.points !== a.points ||
      b.displayName !== a.displayName
    ) {
      changes.push({
        popId,
        displayName: a.displayName,
        placeBefore: b.place,
        placeAfter: a.place,
        pointsBefore: b.points,
        pointsAfter: a.points,
        kind: 'modified'
      })
    }
  }

  for (const [popId, b] of beforeMap) {
    if (!afterMap.has(popId)) {
      changes.push({
        popId,
        displayName: b.displayName,
        placeBefore: b.place,
        pointsBefore: b.points,
        kind: 'removed'
      })
    }
  }

  return changes
}

export function parseDeductionsInput(raw: unknown[]): PointDeduction[] {
  const out: PointDeduction[] = []
  const seen = new Set<string>()
  for (const item of raw.slice(0, MAX_ROWS)) {
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    const popId = popidForStorage(
      typeof r.popId === 'string' ? r.popId : String(r.popId ?? '')
    )
    if (!popId || seen.has(popId)) continue
    seen.add(popId)
    const subtract = Math.max(
      0,
      Math.min(POINTS_MAX, normalizeStorePointsAmount(r.subtract))
    )
    if (subtract <= 0) continue
    const reason =
      typeof r.reason === 'string' ? r.reason.trim().slice(0, REASON_MAX) : ''
    out.push({ popId, subtract, reason })
  }
  return out
}

export function applyDeductionsToRows(
  before: ParsedAwardRow[],
  deductions: PointDeduction[]
):
  | {
      ok: true
      after: ParsedAwardRow[]
      changes: ITournamentPointsAuditChange[]
    }
  | { ok: false; error: string } {
  if (deductions.length === 0) {
    return { ok: false, error: 'Indica al menos un descuento' }
  }

  const beforeMap = new Map(before.map(r => [r.popId, r]))
  const after = before.map(r => ({ ...r }))
  const afterMap = new Map(after.map(r => [r.popId, r]))
  const changes: ITournamentPointsAuditChange[] = []

  for (const d of deductions) {
    if (d.reason.length < REASON_MIN) {
      return {
        ok: false,
        error: `El motivo debe tener al menos ${REASON_MIN} caracteres`
      }
    }
    const row = beforeMap.get(d.popId)
    if (!row) {
      return {
        ok: false,
        error: `Jugador no encontrado en este torneo (${d.popId})`
      }
    }
    if (d.subtract > row.points) {
      return {
        ok: false,
        error: `No puedes descontar más de ${row.points} pts a ${row.displayName}`
      }
    }
    const nextPoints = normalizeStorePointsAmount(row.points - d.subtract)
    const updated = afterMap.get(d.popId)!
    updated.points = nextPoints
    changes.push({
      popId: d.popId,
      displayName: row.displayName,
      placeBefore: row.place,
      placeAfter: row.place,
      pointsBefore: row.points,
      pointsAfter: nextPoints,
      reason: d.reason,
      kind: 'modified'
    })
  }

  return { ok: true, after, changes }
}

export function applyAdditionsToRows(
  before: ParsedAwardRow[],
  additions: PointAddition[]
):
  | {
      ok: true
      after: ParsedAwardRow[]
      changes: ITournamentPointsAuditChange[]
    }
  | { ok: false; error: string } {
  if (additions.length === 0) {
    return { ok: false, error: 'Indica al menos un abono' }
  }

  const beforeMap = new Map(before.map(r => [r.popId, r]))
  const after = before.map(r => ({ ...r }))
  const afterMap = new Map(after.map(r => [r.popId, r]))
  const changes: ITournamentPointsAuditChange[] = []

  for (const a of additions) {
    if (a.reason.length < REASON_MIN) {
      return {
        ok: false,
        error: `El motivo debe tener al menos ${REASON_MIN} caracteres`
      }
    }
    const row = beforeMap.get(a.popId)
    if (!row) {
      return {
        ok: false,
        error: `Jugador no encontrado en este torneo (${a.popId})`
      }
    }
    const nextPoints = Math.min(
      POINTS_MAX,
      normalizeStorePointsAmount(row.points + a.add)
    )
    if (nextPoints <= row.points) {
      return { ok: false, error: 'La cantidad a sumar debe ser mayor que 0' }
    }
    const updated = afterMap.get(a.popId)!
    updated.points = nextPoints
    changes.push({
      popId: a.popId,
      displayName: row.displayName,
      placeBefore: row.place,
      placeAfter: row.place,
      pointsBefore: row.points,
      pointsAfter: nextPoints,
      reason: a.reason,
      kind: 'modified'
    })
  }

  return { ok: true, after, changes }
}

export async function applyAwardRowCreditDeltas(
  before: ParsedAwardRow[],
  after: ParsedAwardRow[],
  popToUser: Map<string, mongoose.Types.ObjectId>,
  storeOid: mongoose.Types.ObjectId,
  primaryStoreOid: mongoose.Types.ObjectId | null
): Promise<{ adjustments: number; skippedNoUser: number }> {
  const beforeMap = new Map(before.map(r => [r.popId, r.points]))
  const afterMap = new Map(after.map(r => [r.popId, r.points]))
  const pops = new Set([...beforeMap.keys(), ...afterMap.keys()])
  let adjustments = 0
  let skippedNoUser = 0

  for (const popId of pops) {
    const prev = beforeMap.get(popId) ?? 0
    const next = afterMap.get(popId) ?? 0
    const delta = next - prev
    if (delta === 0) continue

    const uid =
      after.find(r => r.popId === popId)?.userId ??
      before.find(r => r.popId === popId)?.userId ??
      popToUser.get(popId)
    if (!uid) {
      if (delta !== 0) skippedNoUser++
      continue
    }

    await incrementStoreCreditPoints(uid, storeOid, primaryStoreOid, delta)
    adjustments++
  }

  return { adjustments, skippedNoUser }
}

export function buildAuditSummary(
  action: TournamentPointsAuditAction,
  changes: ITournamentPointsAuditChange[]
): string {
  if (action === 'created') {
    const total = changes.reduce((s, c) => s + (c.pointsAfter ?? 0), 0)
    return `Asignación inicial: ${changes.length} jugador(es), ${total} pts en total`
  }
  if (action === 'deducted') {
    const parts = changes.map(c => {
      const delta = (c.pointsBefore ?? 0) - (c.pointsAfter ?? 0)
      return `${c.displayName} −${delta} pts`
    })
    const head = `Descuento: ${parts.join(', ')}`
    const reasons = [
      ...new Set(changes.map(c => c.reason?.trim()).filter(Boolean))
    ] as string[]
    if (reasons.length === 1) return `${head} · Motivo: ${reasons[0]}`
    if (reasons.length > 1) return `${head} · Varios motivos (ver detalle)`
    return head
  }
  const ptsDelta = changes.reduce((s, c) => {
    const b = c.pointsBefore ?? 0
    const a = c.pointsAfter ?? 0
    return s + (a - b)
  }, 0)
  const parts: string[] = []
  const mod = changes.filter(c => c.kind === 'modified').length
  const add = changes.filter(c => c.kind === 'added').length
  const rem = changes.filter(c => c.kind === 'removed').length
  if (mod) parts.push(`${mod} modificado(s)`)
  if (add) parts.push(`${add} añadido(s)`)
  if (rem) parts.push(`${rem} quitado(s)`)
  const head = parts.length ? parts.join(', ') : 'sin cambios en filas'
  const deltaStr =
    ptsDelta === 0 ? '' : ` · Δ saldo ${ptsDelta > 0 ? '+' : ''}${ptsDelta} pts`
  return `Actualización: ${head}${deltaStr}`
}

export async function writeTournamentPointsAuditLog(input: {
  storeId: mongoose.Types.ObjectId
  awardId: mongoose.Types.ObjectId
  eventId?: mongoose.Types.ObjectId
  eventTitle: string
  action: TournamentPointsAuditAction
  changedByUserId?: mongoose.Types.ObjectId
  changedByName?: string
  changes: ITournamentPointsAuditChange[]
}): Promise<void> {
  const summary = buildAuditSummary(input.action, input.changes)
  await TournamentPointsAuditLog.create({
    storeId: input.storeId,
    awardId: input.awardId,
    eventId: input.eventId,
    eventTitle: input.eventTitle.slice(0, 300),
    action: input.action,
    changedByUserId: input.changedByUserId,
    changedByName: input.changedByName?.slice(0, 200),
    summary,
    changes: input.changes
  })
}

export async function staffDisplayName(
  userId: mongoose.Types.ObjectId | undefined
): Promise<string> {
  if (!userId) return 'Staff'
  const u = await User.findById(userId).select('name email').lean<{
    name?: string
    email?: string
  } | null>()
  const name = u?.name?.trim()
  if (name) return name.slice(0, 200)
  const email = u?.email?.trim()
  if (email) return email.slice(0, 200)
  return 'Staff'
}

export type FlatPlayerPointsRow = {
  awardId: string
  eventTitle: string
  awardedAt: string | null
  popId: string
  userId: string | null
  displayName: string
  points: number
}

export type PlayerPointsSource = {
  awardId: string
  eventTitle: string
  points: number
  popId: string
  displayName: string
  awardedAt: string | null
}

export type AggregatedTournamentPointsPlayer = {
  identityKey: string
  userId: string | null
  primaryPopId: string
  displayName: string
  pointsTotal: number
  sources: PlayerPointsSource[]
}

export async function aggregateTournamentPointsByPlayer(
  rows: FlatPlayerPointsRow[]
): Promise<AggregatedTournamentPointsPlayer[]> {
  const parsed: ParsedAwardRow[] = rows.map(r => ({
    place: 1,
    displayName: r.displayName,
    popId: r.popId,
    userId:
      r.userId && mongoose.Types.ObjectId.isValid(r.userId)
        ? new mongoose.Types.ObjectId(r.userId)
        : undefined,
    points: r.points
  }))
  const popToUser = await resolveUserIdsForAwardRows(parsed)

  const userIds = [
    ...new Set(
      rows
        .map(r => {
          const uid = r.userId ?? popToUser.get(r.popId)?.toString() ?? null
          return uid
        })
        .filter((id): id is string => Boolean(id))
    )
  ]

  const userNames = new Map<string, string>()
  if (userIds.length > 0) {
    const users = await User.find({
      _id: {
        $in: userIds.map(id => new mongoose.Types.ObjectId(id))
      }
    })
      .select('name email popid')
      .lean()
    for (const u of users) {
      const id = String((u as { _id: unknown })._id)
      const name =
        String((u as { name?: string }).name ?? '').trim() ||
        String((u as { email?: string }).email ?? '').trim()
      if (name) userNames.set(id, name.slice(0, 200))
      const pop = popidForStorage(String((u as { popid?: string }).popid ?? ''))
      if (pop) popToUser.set(pop, (u as { _id: mongoose.Types.ObjectId })._id)
    }
  }

  const groups = new Map<
    string,
    {
      userId: string | null
      primaryPopId: string
      displayName: string
      pointsTotal: number
      sources: PlayerPointsSource[]
    }
  >()

  for (const row of rows) {
    const resolvedUserId =
      row.userId ?? popToUser.get(row.popId)?.toString() ?? null
    const identityKey = resolvedUserId
      ? `u:${resolvedUserId}`
      : `p:${row.popId}`
    const g = groups.get(identityKey) ?? {
      userId: resolvedUserId,
      primaryPopId: row.popId,
      displayName: row.displayName,
      pointsTotal: 0,
      sources: []
    }
    g.pointsTotal += row.points
    g.sources.push({
      awardId: row.awardId,
      eventTitle: row.eventTitle,
      points: row.points,
      popId: row.popId,
      displayName: row.displayName,
      awardedAt: row.awardedAt
    })
    if (resolvedUserId && userNames.has(resolvedUserId)) {
      g.displayName = userNames.get(resolvedUserId)!
    } else if (row.displayName.length > g.displayName.length) {
      g.displayName = row.displayName
    }
    if (!g.userId) g.primaryPopId = row.popId
    groups.set(identityKey, g)
  }

  return [...groups.entries()]
    .map(([identityKey, g]) => ({
      identityKey,
      userId: g.userId,
      primaryPopId: g.primaryPopId,
      displayName: g.displayName,
      pointsTotal: g.pointsTotal,
      sources: g.sources.sort((a, b) => b.points - a.points)
    }))
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' })
    )
}

/** Incluye jugadores que ya no tienen saldo pero aparecen en auditoría. */
export async function appendPlayersFromAuditHistory(
  players: AggregatedTournamentPointsPlayer[],
  storeOid: mongoose.Types.ObjectId
): Promise<AggregatedTournamentPointsPlayer[]> {
  const byKey = new Map(players.map(p => [p.identityKey, p]))
  const knownPops = new Set<string>()
  for (const p of players) {
    if (p.primaryPopId) knownPops.add(p.primaryPopId)
    for (const s of p.sources) knownPops.add(s.popId)
  }

  const logs = (await TournamentPointsAuditLog.find({ storeId: storeOid })
    .select('changes')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean()) as { changes?: ITournamentPointsAuditChange[] }[]

  const missingPops = new Map<string, string>()
  for (const log of logs) {
    for (const c of log.changes ?? []) {
      if (!c.popId || knownPops.has(c.popId)) continue
      const hadPoints =
        (c.pointsBefore ?? 0) > 0 ||
        (c.pointsAfter ?? 0) > 0 ||
        c.kind === 'added' ||
        c.kind === 'removed'
      if (!hadPoints) continue
      if (!missingPops.has(c.popId)) {
        missingPops.set(c.popId, c.displayName)
      }
    }
  }

  if (missingPops.size === 0) {
    return players
  }

  const popToUser = await resolveUserIdsForAwardRows(
    [...missingPops.entries()].map(([popId, displayName]) => ({
      place: 1,
      displayName,
      popId,
      points: 0
    }))
  )

  const userIds = [...new Set([...popToUser.values()].map(id => id.toString()))]
  const userNames = new Map<string, string>()
  if (userIds.length > 0) {
    const users = await User.find({
      _id: {
        $in: userIds.map(id => new mongoose.Types.ObjectId(id))
      }
    })
      .select('name email popid')
      .lean()
    for (const u of users) {
      const id = String((u as { _id: unknown })._id)
      const name =
        String((u as { name?: string }).name ?? '').trim() ||
        String((u as { email?: string }).email ?? '').trim()
      if (name) userNames.set(id, name.slice(0, 200))
    }
  }

  for (const [popId, displayName] of missingPops) {
    const uid = popToUser.get(popId)?.toString() ?? null
    const identityKey = uid ? `u:${uid}` : `p:${popId}`
    if (byKey.has(identityKey)) {
      knownPops.add(popId)
      continue
    }
    byKey.set(identityKey, {
      identityKey,
      userId: uid,
      primaryPopId: popId,
      displayName:
        uid && userNames.has(uid) ? userNames.get(uid)! : displayName,
      pointsTotal: 0,
      sources: []
    })
    knownPops.add(popId)
  }

  return [...byKey.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' })
  )
}

export async function loadExcludedTournamentPointsIdentityKeys(
  storeOid: mongoose.Types.ObjectId
): Promise<Set<string>> {
  const rows = await TournamentPointsListExclusion.find({ storeId: storeOid })
    .select('identityKey')
    .lean<{ identityKey?: string }[]>()
  return new Set(
    rows
      .map(r => (typeof r.identityKey === 'string' ? r.identityKey.trim() : ''))
      .filter(Boolean)
  )
}

export function filterExcludedTournamentPointsPlayers(
  players: AggregatedTournamentPointsPlayer[],
  excluded: ReadonlySet<string>
): AggregatedTournamentPointsPlayer[] {
  if (excluded.size === 0) return players
  return players.filter(p => !excluded.has(p.identityKey))
}

export function collectPopIdsForPlayer(input: {
  primaryPopId: string
  sources: PlayerPointsSource[]
}): string[] {
  return [
    ...new Set(
      [input.primaryPopId, ...input.sources.map(s => s.popId)]
        .map(p => popidForStorage(p))
        .filter(Boolean)
    )
  ]
}

function rowBelongsToIdentity(
  row: ParsedAwardRow,
  userId: string | null,
  primaryPopId: string,
  popsForUser: Set<string>
): boolean {
  if (userId) {
    if (row.userId?.toString() === userId) return true
    if (popsForUser.has(row.popId)) return true
    return false
  }
  return row.popId === primaryPopId
}

export async function deductTournamentPointsForPlayer(input: {
  storeOid: mongoose.Types.ObjectId
  primaryStoreOid: mongoose.Types.ObjectId | null
  userId: string | null
  primaryPopId: string
  subtract: number
  reason: string
  changedByUserId?: mongoose.Types.ObjectId
  changedByName: string
}): Promise<{
  ok: true
  changed: boolean
  adjustments: number
  skippedNoUser: number
  awardsTouched: number
}> {
  const reason = input.reason.trim().slice(0, REASON_MAX)
  if (reason.length < REASON_MIN) {
    throw new Error(`El motivo debe tener al menos ${REASON_MIN} caracteres`)
  }
  const subtract = Math.max(
    0,
    Math.min(POINTS_MAX, normalizeStorePointsAmount(input.subtract))
  )
  if (subtract <= 0) {
    return {
      ok: true,
      changed: false,
      adjustments: 0,
      skippedNoUser: 0,
      awardsTouched: 0
    }
  }

  const popsForUser = new Set<string>([input.primaryPopId])
  if (input.userId && mongoose.Types.ObjectId.isValid(input.userId)) {
    const u = await User.findById(input.userId).select('popid').lean<{
      popid?: string
    } | null>()
    const pop = popidForStorage(String(u?.popid ?? ''))
    if (pop) popsForUser.add(pop)
  }

  const awards = await TournamentPointsAward.find({
    storeId: input.storeOid
  }).sort({ createdAt: 1 })

  type Slice = {
    award: (typeof awards)[number]
    beforeRows: ParsedAwardRow[]
    popId: string
    available: number
  }

  const slices: Slice[] = []
  for (const award of awards) {
    const beforeRows: ParsedAwardRow[] = (award.rows ?? []).map(
      (r: ITournamentPointsAwardRow) => ({
        place: r.place,
        displayName: r.displayName,
        popId: r.popId,
        userId: r.userId,
        points: r.points
      })
    )
    for (const row of beforeRows) {
      if (
        !rowBelongsToIdentity(
          row,
          input.userId,
          input.primaryPopId,
          popsForUser
        )
      ) {
        continue
      }
      if (row.points <= 0) continue
      slices.push({
        award,
        beforeRows,
        popId: row.popId,
        available: row.points
      })
    }
  }

  const totalAvailable = slices.reduce((s, x) => s + x.available, 0)
  if (subtract > totalAvailable) {
    throw new Error(
      `No puedes descontar más de ${totalAvailable} pts para este jugador`
    )
  }

  let remaining = subtract
  let adjustments = 0
  let skippedNoUser = 0
  let awardsTouched = 0

  for (const slice of slices) {
    if (remaining <= 0) break
    const take = Math.min(remaining, slice.available)
    if (take <= 0) continue

    const applied = applyDeductionsToRows(slice.beforeRows, [
      { popId: slice.popId, subtract: take, reason }
    ])
    if (!applied.ok) {
      throw new Error(applied.error)
    }
    if (applied.changes.length === 0) continue

    const afterParsed = applied.after
    const popToUser = await resolveUserIdsForAwardRows(afterParsed)
    for (const row of afterParsed) {
      if (!row.userId) {
        const uid = popToUser.get(row.popId)
        if (uid) row.userId = uid
      }
    }

    const credit = await applyAwardRowCreditDeltas(
      slice.beforeRows,
      afterParsed,
      popToUser,
      input.storeOid,
      input.primaryStoreOid
    )
    adjustments += credit.adjustments
    skippedNoUser += credit.skippedNoUser

    slice.award.rows = rowsToSnapshot(afterParsed)
    slice.award.topCount = afterParsed.filter(r => r.points > 0).length
    slice.award.markModified('rows')
    await slice.award.save()

    await writeTournamentPointsAuditLog({
      storeId: input.storeOid,
      awardId: slice.award._id as mongoose.Types.ObjectId,
      eventId: slice.award.eventId as mongoose.Types.ObjectId | undefined,
      eventTitle: slice.award.eventTitle,
      action: 'deducted',
      changedByUserId: input.changedByUserId,
      changedByName: input.changedByName,
      changes: applied.changes
    })

    awardsTouched++
    remaining -= take
  }

  return {
    ok: true,
    changed: subtract > 0,
    adjustments,
    skippedNoUser,
    awardsTouched
  }
}

async function getOrCreateManualAdjustmentAward(
  storeOid: mongoose.Types.ObjectId,
  staffUserId?: mongoose.Types.ObjectId
) {
  let award = await TournamentPointsAward.findOne({
    storeId: storeOid,
    importGroupKey: MANUAL_TOURNAMENT_POINTS_GROUP_KEY
  })
  if (!award) {
    award = await TournamentPointsAward.create({
      storeId: storeOid,
      importGroupKey: MANUAL_TOURNAMENT_POINTS_GROUP_KEY,
      eventTitle: 'Ajuste manual',
      playerCount: 0,
      topCount: 0,
      rows: [],
      createdByUserId: staffUserId
    })
  }
  return award
}

async function persistAwardRowsUpdate(args: {
  award: mongoose.Document & {
    rows: ITournamentPointsAwardRow[]
    topCount?: number
    playerCount?: number
    eventTitle: string
    eventId?: mongoose.Types.ObjectId
    _id: mongoose.Types.ObjectId
    markModified: (path: string) => void
    save: () => Promise<unknown>
  }
  beforeRows: ParsedAwardRow[]
  afterParsed: ParsedAwardRow[]
  changes: ITournamentPointsAuditChange[]
  storeOid: mongoose.Types.ObjectId
  primaryStoreOid: mongoose.Types.ObjectId | null
  changedByUserId?: mongoose.Types.ObjectId
  changedByName: string
  auditAction: TournamentPointsAuditAction
}): Promise<{ adjustments: number; skippedNoUser: number }> {
  const popToUser = await resolveUserIdsForAwardRows(args.afterParsed)
  for (const row of args.afterParsed) {
    if (!row.userId) {
      const uid = popToUser.get(row.popId)
      if (uid) row.userId = uid
    }
  }

  const credit = await applyAwardRowCreditDeltas(
    args.beforeRows,
    args.afterParsed,
    popToUser,
    args.storeOid,
    args.primaryStoreOid
  )

  args.award.rows = rowsToSnapshot(args.afterParsed)
  args.award.topCount = args.afterParsed.filter(r => r.points > 0).length
  args.award.playerCount = args.afterParsed.length
  args.award.markModified('rows')
  await args.award.save()

  await writeTournamentPointsAuditLog({
    storeId: args.storeOid,
    awardId: args.award._id,
    eventId: args.award.eventId,
    eventTitle: args.award.eventTitle,
    action: args.auditAction,
    changedByUserId: args.changedByUserId,
    changedByName: args.changedByName,
    changes: args.changes
  })

  return credit
}

export async function addTournamentPointsForPlayer(input: {
  storeOid: mongoose.Types.ObjectId
  primaryStoreOid: mongoose.Types.ObjectId | null
  userId: string | null
  primaryPopId: string
  displayName: string
  add: number
  reason: string
  changedByUserId?: mongoose.Types.ObjectId
  changedByName: string
}): Promise<{
  ok: true
  changed: boolean
  adjustments: number
  skippedNoUser: number
  awardsTouched: number
}> {
  const reason = input.reason.trim().slice(0, REASON_MAX)
  if (reason.length < REASON_MIN) {
    throw new Error(`El motivo debe tener al menos ${REASON_MIN} caracteres`)
  }
  const add = Math.max(
    0,
    Math.min(POINTS_MAX, normalizeStorePointsAmount(input.add))
  )
  if (add <= 0) {
    return {
      ok: true,
      changed: false,
      adjustments: 0,
      skippedNoUser: 0,
      awardsTouched: 0
    }
  }

  const primaryPop = popidForStorage(input.primaryPopId)
  if (!primaryPop) {
    throw new Error('POP ID inválido')
  }

  const popsForUser = new Set<string>([primaryPop])
  if (input.userId && mongoose.Types.ObjectId.isValid(input.userId)) {
    const u = await User.findById(input.userId)
      .select('popid name email')
      .lean<{
        popid?: string
        name?: string
        email?: string
      } | null>()
    const pop = popidForStorage(String(u?.popid ?? ''))
    if (pop) popsForUser.add(pop)
  }

  const displayName = input.displayName.trim().slice(0, 200) || primaryPop

  const awards = await TournamentPointsAward.find({
    storeId: input.storeOid
  }).sort({ createdAt: -1 })

  let targetAward: (typeof awards)[number] | null = null
  let targetBeforeRows: ParsedAwardRow[] = []
  let targetPopId = primaryPop

  for (const award of awards) {
    if (
      award.importGroupKey === MANUAL_TOURNAMENT_POINTS_GROUP_KEY &&
      !targetAward
    ) {
      continue
    }
    const beforeRows: ParsedAwardRow[] = (award.rows ?? []).map(
      (r: ITournamentPointsAwardRow) => ({
        place: r.place,
        displayName: r.displayName,
        popId: r.popId,
        userId: r.userId,
        points: r.points
      })
    )
    const match = beforeRows.find(row =>
      rowBelongsToIdentity(row, input.userId, primaryPop, popsForUser)
    )
    if (match) {
      targetAward = award
      targetBeforeRows = beforeRows
      targetPopId = match.popId
      break
    }
  }

  let afterParsed: ParsedAwardRow[]
  let changes: ITournamentPointsAuditChange[]

  if (targetAward) {
    const applied = applyAdditionsToRows(targetBeforeRows, [
      { popId: targetPopId, add, reason }
    ])
    if (!applied.ok) {
      throw new Error(applied.error)
    }
    afterParsed = applied.after
    changes = applied.changes
  } else {
    const manual = await getOrCreateManualAdjustmentAward(
      input.storeOid,
      input.changedByUserId
    )
    targetAward = manual
    targetBeforeRows = (manual.rows ?? []).map(
      (r: ITournamentPointsAwardRow) => ({
        place: r.place,
        displayName: r.displayName,
        popId: r.popId,
        userId: r.userId,
        points: r.points
      })
    )
    const existing = targetBeforeRows.find(row =>
      rowBelongsToIdentity(row, input.userId, primaryPop, popsForUser)
    )
    if (existing) {
      const applied = applyAdditionsToRows(targetBeforeRows, [
        { popId: existing.popId, add, reason }
      ])
      if (!applied.ok) {
        throw new Error(applied.error)
      }
      afterParsed = applied.after
      changes = applied.changes
    } else {
      let userId: mongoose.Types.ObjectId | undefined
      if (input.userId && mongoose.Types.ObjectId.isValid(input.userId)) {
        userId = new mongoose.Types.ObjectId(input.userId)
      } else {
        const map = await resolveUserIdsForAwardRows([
          { place: 1, displayName, popId: primaryPop, points: 0 }
        ])
        userId = map.get(primaryPop)
      }
      const newRow: ParsedAwardRow = {
        place: Math.max(1, targetBeforeRows.length + 1),
        displayName,
        popId: primaryPop,
        userId,
        points: add
      }
      afterParsed = [...targetBeforeRows, newRow]
      changes = diffAwardRows(targetBeforeRows, afterParsed).map(c => ({
        ...c,
        reason
      }))
    }
  }

  const credit = await persistAwardRowsUpdate({
    award: targetAward,
    beforeRows: targetBeforeRows,
    afterParsed,
    changes,
    storeOid: input.storeOid,
    primaryStoreOid: input.primaryStoreOid,
    changedByUserId: input.changedByUserId,
    changedByName: input.changedByName,
    auditAction: 'updated'
  })

  return {
    ok: true,
    changed: true,
    adjustments: credit.adjustments,
    skippedNoUser: credit.skippedNoUser,
    awardsTouched: 1
  }
}

export async function removeTournamentPointsPlayerFromList(input: {
  storeOid: mongoose.Types.ObjectId
  primaryStoreOid: mongoose.Types.ObjectId | null
  userId: string | null
  primaryPopId: string
  displayName: string
  reason: string
  changedByUserId?: mongoose.Types.ObjectId
  changedByName: string
}): Promise<{
  ok: true
  changed: boolean
  rowsRemoved: number
  pointsRemoved: number
  adjustments: number
  skippedNoUser: number
  awardsTouched: number
}> {
  const reason = input.reason.trim().slice(0, REASON_MAX)
  if (reason.length < REASON_MIN) {
    throw new Error(`El motivo debe tener al menos ${REASON_MIN} caracteres`)
  }

  const primaryPop = popidForStorage(input.primaryPopId)
  if (!primaryPop) {
    throw new Error('POP ID inválido')
  }

  const popsForUser = new Set<string>([primaryPop])
  if (input.userId && mongoose.Types.ObjectId.isValid(input.userId)) {
    const u = await User.findById(input.userId).select('popid').lean<{
      popid?: string
    } | null>()
    const pop = popidForStorage(String(u?.popid ?? ''))
    if (pop) popsForUser.add(pop)
  }

  const identityKey = input.userId ? `u:${input.userId}` : `p:${primaryPop}`
  const displayName = input.displayName.trim().slice(0, 200) || primaryPop

  const awards = await TournamentPointsAward.find({
    storeId: input.storeOid
  }).sort({ createdAt: 1 })

  let rowsRemoved = 0
  let pointsRemoved = 0
  let adjustments = 0
  let skippedNoUser = 0
  let awardsTouched = 0

  for (const award of awards) {
    const beforeRows: ParsedAwardRow[] = (award.rows ?? []).map(
      (r: ITournamentPointsAwardRow) => ({
        place: r.place,
        displayName: r.displayName,
        popId: r.popId,
        userId: r.userId,
        points: r.points
      })
    )
    const afterParsed = beforeRows.filter(
      row => !rowBelongsToIdentity(row, input.userId, primaryPop, popsForUser)
    )
    if (afterParsed.length === beforeRows.length) continue

    rowsRemoved += beforeRows.length - afterParsed.length
    pointsRemoved += beforeRows
      .filter(row =>
        rowBelongsToIdentity(row, input.userId, primaryPop, popsForUser)
      )
      .reduce((s, row) => s + row.points, 0)

    const changes = diffAwardRows(beforeRows, afterParsed).map(c => ({
      ...c,
      reason
    }))

    const credit = await persistAwardRowsUpdate({
      award,
      beforeRows,
      afterParsed,
      changes,
      storeOid: input.storeOid,
      primaryStoreOid: input.primaryStoreOid,
      changedByUserId: input.changedByUserId,
      changedByName: input.changedByName,
      auditAction: 'updated'
    })
    adjustments += credit.adjustments
    skippedNoUser += credit.skippedNoUser
    awardsTouched++
  }

  const userOid =
    input.userId && mongoose.Types.ObjectId.isValid(input.userId)
      ? new mongoose.Types.ObjectId(input.userId)
      : undefined

  await TournamentPointsListExclusion.findOneAndUpdate(
    { storeId: input.storeOid, identityKey },
    {
      $set: {
        identityKey,
        userId: userOid,
        primaryPopId: primaryPop,
        displayName,
        reason,
        excludedByUserId: input.changedByUserId
      }
    },
    { upsert: true }
  )

  return {
    ok: true,
    changed: true,
    rowsRemoved,
    pointsRemoved,
    adjustments,
    skippedNoUser,
    awardsTouched
  }
}

async function playerHasTournamentPointsInStore(args: {
  storeOid: mongoose.Types.ObjectId
  popId: string
  userId: string | null
}): Promise<boolean> {
  const popsForUser = new Set<string>([args.popId])
  if (args.userId && mongoose.Types.ObjectId.isValid(args.userId)) {
    const u = await User.findById(args.userId).select('popid').lean<{
      popid?: string
    } | null>()
    const pop = popidForStorage(String(u?.popid ?? ''))
    if (pop) popsForUser.add(pop)
  }

  const awards = await TournamentPointsAward.find({ storeId: args.storeOid })
  for (const award of awards) {
    for (const row of award.rows ?? []) {
      const parsed: ParsedAwardRow = {
        place: row.place,
        displayName: row.displayName,
        popId: row.popId,
        userId: row.userId,
        points: row.points
      }
      if (rowBelongsToIdentity(parsed, args.userId, args.popId, popsForUser)) {
        return true
      }
    }
  }
  return false
}

/** Alta manual de jugador con POP, nombre y puntos iniciales (torneo «Ajuste manual»). */
export async function registerTournamentPointsPlayerManually(input: {
  storeOid: mongoose.Types.ObjectId
  primaryStoreOid: mongoose.Types.ObjectId | null
  popId: string
  displayName: string
  points: number
  applyBalance: boolean
  changedByUserId?: mongoose.Types.ObjectId
  changedByName: string
}): Promise<{
  ok: true
  popId: string
  displayName: string
  points: number
  userLinked: boolean
  credited: boolean
  adjustments: number
  skippedNoUser: number
}> {
  const popId = popidForStorage(input.popId)
  if (!popId) {
    throw new Error('POP ID inválido')
  }

  const displayName = input.displayName.trim().slice(0, 200) || popId
  const points = Math.max(
    0,
    Math.min(POINTS_MAX, Math.round(Number(input.points) || 0))
  )
  if (points <= 0) {
    throw new Error('Los puntos deben ser mayor que 0')
  }

  const popToUser = await resolveUserIdsForAwardRows([
    { place: 1, displayName, popId, points: 0 }
  ])
  const linkedUser = popToUser.get(popId)
  const userId = linkedUser?.toString() ?? null

  if (
    await playerHasTournamentPointsInStore({
      storeOid: input.storeOid,
      popId,
      userId
    })
  ) {
    throw new Error(
      'Este jugador ya tiene puntos asignados en la tienda. Usa Sumar o edita desde la lista.'
    )
  }

  const identityKey = userId ? `u:${userId}` : `p:${popId}`
  await TournamentPointsListExclusion.deleteOne({
    storeId: input.storeOid,
    identityKey
  })

  const manual = await getOrCreateManualAdjustmentAward(
    input.storeOid,
    input.changedByUserId
  )
  const beforeRows: ParsedAwardRow[] = (manual.rows ?? []).map(
    (r: ITournamentPointsAwardRow) => ({
      place: r.place,
      displayName: r.displayName,
      popId: r.popId,
      userId: r.userId,
      points: r.points
    })
  )

  const newRow: ParsedAwardRow = {
    place: Math.max(1, beforeRows.length + 1),
    displayName,
    popId,
    userId: linkedUser,
    points
  }
  const afterParsed = [...beforeRows, newRow]
  const changes = diffAwardRows(beforeRows, afterParsed).map(c => ({
    ...c,
    reason: 'Registro manual por staff'
  }))

  let adjustments = 0
  let skippedNoUser = 0
  if (input.applyBalance) {
    const credit = await applyAwardRowCreditDeltas(
      beforeRows,
      afterParsed,
      popToUser,
      input.storeOid,
      input.primaryStoreOid
    )
    adjustments = credit.adjustments
    skippedNoUser = credit.skippedNoUser
  }

  manual.rows = rowsToSnapshot(afterParsed)
  manual.topCount = afterParsed.filter(r => r.points > 0).length
  manual.playerCount = afterParsed.length
  manual.markModified('rows')
  await manual.save()

  await writeTournamentPointsAuditLog({
    storeId: input.storeOid,
    awardId: manual._id as mongoose.Types.ObjectId,
    eventTitle: manual.eventTitle,
    action: 'created',
    changedByUserId: input.changedByUserId,
    changedByName: input.changedByName,
    changes
  })

  return {
    ok: true,
    popId,
    displayName,
    points,
    userLinked: Boolean(linkedUser),
    credited: input.applyBalance,
    adjustments,
    skippedNoUser
  }
}
