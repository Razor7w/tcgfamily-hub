import {
  aggregateLeagueStandings,
  leagueEventHasContributingRecord,
  type LeagueStandingRow
} from '@/lib/league-aggregate'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { weeklyEventLeagueAggregateProjection } from '@/lib/weekly-event-query-projections'
import League from '@/models/League'
import Store from '@/models/Store'
import WeeklyEvent from '@/models/WeeklyEvent'
import mongoose from 'mongoose'

export type LeaguePublicCacheTournamentSummary = {
  _id: string
  title: string
  startsAt: string
  hasRecord: boolean
}

export type LeaguePublicCacheChartRow = {
  name: string
  points: number
  popId: string
}

export type LeaguePublicCachePayload = {
  countBestEvents: number | null
  standings: LeagueStandingRow[]
  chartTop: LeaguePublicCacheChartRow[]
  tournaments: LeaguePublicCacheTournamentSummary[]
}

function normalizeCountBestEvents(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }
  return null
}

export function isStoredLeaguePublicCache(
  value: unknown,
  countBestEvents: number | null
): value is LeaguePublicCachePayload {
  if (!value || typeof value !== 'object') return false
  const o = value as LeaguePublicCachePayload
  return (
    o.countBestEvents === countBestEvents &&
    Array.isArray(o.standings) &&
    Array.isArray(o.chartTop) &&
    Array.isArray(o.tournaments)
  )
}

async function loadClosedLeagueEvents(
  leagueId: mongoose.Types.ObjectId,
  effectiveStoreOid: mongoose.Types.ObjectId,
  primStoreOid: mongoose.Types.ObjectId | null
) {
  const evScope = mongoFilterByStore(
    effectiveStoreOid,
    primStoreOid
  ) as Record<string, unknown>
  return WeeklyEvent.find({
    leagueId,
    tournamentOrigin: 'official',
    kind: 'tournament',
    state: 'close',
    ...evScope
  })
    .select(weeklyEventLeagueAggregateProjection)
    .sort({ startsAt: 1 })
    .lean()
}

function buildPayloadFromEvents(
  events: Awaited<ReturnType<typeof loadClosedLeagueEvents>>,
  countBestEvents: number | null
): LeaguePublicCachePayload {
  const standings = aggregateLeagueStandings(
    events as Parameters<typeof aggregateLeagueStandings>[0],
    countBestEvents
  )
  const tournaments = events.map(ev => ({
    _id: String(ev._id),
    title: String(ev.title ?? ''),
    startsAt:
      ev.startsAt instanceof Date
        ? ev.startsAt.toISOString()
        : new Date(ev.startsAt as unknown as string).toISOString(),
    hasRecord: leagueEventHasContributingRecord(
      ev as Parameters<typeof leagueEventHasContributingRecord>[0]
    )
  }))
  const chartTop = standings.slice(0, 12).map(r => ({
    name: r.displayName,
    points: r.totalPoints,
    popId: r.popId
  }))
  return { countBestEvents, standings, chartTop, tournaments }
}

export async function invalidateLeaguePublicCache(
  leagueId: string
): Promise<void> {
  const id = leagueId.trim()
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return
  await League.updateOne(
    { _id: id },
    { $unset: { leaguePublicCache: 1 } }
  )
}

export async function refreshLeaguePublicCache(
  leagueId: string
): Promise<LeaguePublicCachePayload | null> {
  const id = leagueId.trim()
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null

  const leagueOid = new mongoose.Types.ObjectId(id)
  const leagueDoc = await League.findById(leagueOid)
    .select('countBestEvents storeId')
    .lean<{
      countBestEvents?: number | null
      storeId?: mongoose.Types.ObjectId
    } | null>()
  if (!leagueDoc) return null

  const countBestEvents = normalizeCountBestEvents(leagueDoc.countBestEvents)
  const prim = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  const effectiveStoreOid =
    leagueDoc.storeId != null
      ? new mongoose.Types.ObjectId(leagueDoc.storeId)
      : (prim?._id ?? leagueOid)

  const events = await loadClosedLeagueEvents(
    leagueOid,
    effectiveStoreOid,
    prim?._id ?? null
  )
  const payload = buildPayloadFromEvents(events, countBestEvents)

  await League.updateOne(
    { _id: leagueOid },
    { $set: { leaguePublicCache: payload } }
  )
  return payload
}

export async function getOrBuildLeaguePublicCache(
  leagueId: string,
  countBestEvents: number | null
): Promise<LeaguePublicCachePayload | null> {
  const id = leagueId.trim()
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null

  const gate = await League.findById(id)
    .select('leaguePublicCache countBestEvents')
    .lean<{
      leaguePublicCache?: unknown
      countBestEvents?: number | null
    } | null>()
  if (!gate) return null

  const normalized = normalizeCountBestEvents(gate.countBestEvents)
  if (isStoredLeaguePublicCache(gate.leaguePublicCache, normalized)) {
    return gate.leaguePublicCache
  }

  return refreshLeaguePublicCache(id)
}

/** Tras mutar torneo cerrado de liga: recalcula agregado público. */
export async function syncLeaguePublicCacheForEvent(doc: {
  leagueId?: unknown
  kind?: string
  state?: string
  tournamentOrigin?: string
}): Promise<void> {
  const leagueId = doc.leagueId != null ? String(doc.leagueId).trim() : ''
  if (!leagueId || doc.kind !== 'tournament') return
  if (doc.tournamentOrigin === 'custom') return
  if (doc.state !== 'close') return
  await refreshLeaguePublicCache(leagueId)
}

/** Cuando un torneo deja de estar cerrado o pierde liga: limpia cache obsoleta. */
export async function invalidateLeaguePublicCacheForEvent(doc: {
  leagueId?: unknown
  previousLeagueId?: unknown
}): Promise<void> {
  const ids = new Set<string>()
  for (const raw of [doc.leagueId, doc.previousLeagueId]) {
    if (raw != null) {
      const s = String(raw).trim()
      if (s) ids.add(s)
    }
  }
  await Promise.all([...ids].map(id => invalidateLeaguePublicCache(id)))
}
