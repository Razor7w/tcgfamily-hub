import type { WeeklyEventState } from '@/models/WeeklyEvent'

type LeanAdminParticipant = {
  displayName: string
  userId?: unknown
  createdAt?: Date
  confirmed?: boolean
  popId?: string
  table?: string
  opponentId?: string
  wins?: unknown
  losses?: unknown
  ties?: unknown
}

export function serializeAdminParticipant(p: LeanAdminParticipant) {
  let userIdStr: string | null = null
  const u = p.userId
  if (u && typeof u === 'object') {
    const o = u as { _id?: unknown; popid?: string }
    if (o._id !== undefined) userIdStr = String(o._id)
  } else if (u) {
    userIdStr = String(u)
  }

  let popId = ''
  if (typeof p.popId === 'string' && p.popId.trim()) {
    popId = p.popId.trim()
  } else if (u && typeof u === 'object') {
    const o = u as { popid?: string }
    if (typeof o.popid === 'string') popId = o.popid.trim()
  }

  return {
    displayName: p.displayName,
    userId: userIdStr,
    popId: popId || '—',
    table: typeof p.table === 'string' ? p.table : '',
    opponentId: typeof p.opponentId === 'string' ? p.opponentId : '',
    confirmed: Boolean(p.confirmed),
    wins: Math.max(0, Math.min(999, Math.round(Number(p.wins) || 0))),
    losses: Math.max(0, Math.min(999, Math.round(Number(p.losses) || 0))),
    ties: Math.max(0, Math.min(999, Math.round(Number(p.ties) || 0))),
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined
  }
}

export function serializeAdminWeeklyEventFromLean(
  ev: Record<string, unknown>,
  options?: { roundSnapshotsCount?: number }
) {
  const doc = ev as Record<string, unknown> & {
    _id: unknown
    participants?: LeanAdminParticipant[]
    leagueId?: unknown
  }
  const { _id, participants, leagueId: leagueRaw, ...rest } = doc
  const rawState = rest.state
  const state: WeeklyEventState =
    rawState === 'schedule' || rawState === 'running' || rawState === 'close'
      ? rawState
      : 'schedule'

  let leagueId: string | null = null
  let league: { name: string; slug: string } | null = null
  if (
    leagueRaw &&
    typeof leagueRaw === 'object' &&
    leagueRaw !== null &&
    '_id' in leagueRaw
  ) {
    leagueId = String((leagueRaw as { _id: unknown })._id)
    const o = leagueRaw as { name?: string; slug?: string }
    if (typeof o.name === 'string' && typeof o.slug === 'string') {
      league = { name: o.name, slug: o.slug }
    }
  } else if (leagueRaw) {
    leagueId = String(leagueRaw)
  }

  return {
    ...rest,
    _id: String(_id),
    state,
    leagueId,
    league,
    ...(typeof options?.roundSnapshotsCount === 'number'
      ? { roundSnapshotsCount: options.roundSnapshotsCount }
      : {}),
    participants: (participants ?? []).map(p => serializeAdminParticipant(p))
  }
}
