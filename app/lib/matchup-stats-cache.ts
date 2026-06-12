import mongoose from 'mongoose'
import {
  aggregateMyDeckStats,
  aggregateOpponentMatchupsForMyDeck,
  myDeckSlugsDisplayOrderFromEvents,
  type MyDeckStatsRowDTO,
  type OpponentMatchupRowDTO,
  type TournamentOriginFilter
} from '@/lib/pokemon-matchup-stats'
import {
  weeklyEventMatchupDetailProjection,
  weeklyEventMatchupOverviewProjection
} from '@/lib/weekly-event-query-projections'
import MatchupStatsCache, {
  type MatchupStatsCacheView
} from '@/models/MatchupStatsCache'
import WeeklyEvent from '@/models/WeeklyEvent'

/** Resumen en hub: solo rondas reportadas por el usuario (sin snapshots TDF). */
export const MATCHUP_STATS_MAX_EVENTS_OVERVIEW = 250
/** Detalle de rival: enriquecimiento con snapshots oficiales. */
export const MATCHUP_STATS_MAX_EVENTS_DECK_DETAIL = 80

export type MatchupStatsOverviewPayload = {
  origin: TournamentOriginFilter
  myDecks: MyDeckStatsRowDTO[]
  eventsScanned: number
  eventsWithReportedRounds: number
}

export type MatchupStatsDeckDetailPayload = {
  origin: TournamentOriginFilter
  view: 'deck-detail'
  myDeckKey: string
  myDeckSlugs: string[]
  opponents: OpponentMatchupRowDTO[]
  eventsScanned: number
}

export function originMongoFilter(
  origin: TournamentOriginFilter
): Record<string, unknown> {
  if (origin === 'official') {
    return { tournamentOrigin: { $ne: 'custom' } }
  }
  if (origin === 'custom') {
    return { tournamentOrigin: 'custom' }
  }
  return {}
}

function cacheDeckKey(myDeckKey: string | null): string {
  return myDeckKey?.trim() ? myDeckKey.trim() : ''
}

function isOverviewPayload(value: unknown): value is MatchupStatsOverviewPayload {
  if (!value || typeof value !== 'object') return false
  const o = value as MatchupStatsOverviewPayload
  return Array.isArray(o.myDecks) && typeof o.eventsScanned === 'number'
}

function isDeckDetailPayload(
  value: unknown
): value is MatchupStatsDeckDetailPayload {
  if (!value || typeof value !== 'object') return false
  const o = value as MatchupStatsDeckDetailPayload
  return (
    o.view === 'deck-detail' &&
    typeof o.myDeckKey === 'string' &&
    Array.isArray(o.opponents)
  )
}

async function loadMatchupEvents(
  uid: mongoose.Types.ObjectId,
  origin: TournamentOriginFilter,
  myDeckKey: string | null
) {
  const deckDetail = myDeckKey != null
  return WeeklyEvent.find({
    kind: 'tournament' as const,
    game: 'pokemon' as const,
    ...originMongoFilter(origin),
    participants: {
      $elemMatch: deckDetail
        ? { userId: uid, 'matchRounds.0': { $exists: true } }
        : { userId: uid }
    }
  })
    .sort({ startsAt: -1 })
    .limit(
      deckDetail
        ? MATCHUP_STATS_MAX_EVENTS_DECK_DETAIL
        : MATCHUP_STATS_MAX_EVENTS_OVERVIEW
    )
    .select(
      deckDetail
        ? weeklyEventMatchupDetailProjection
        : weeklyEventMatchupOverviewProjection
    )
    .lean()
}

export async function buildMatchupStatsOverview(
  userId: string,
  uid: mongoose.Types.ObjectId,
  origin: TournamentOriginFilter
): Promise<MatchupStatsOverviewPayload> {
  const docs = await loadMatchupEvents(uid, origin, null)
  const myDecks = aggregateMyDeckStats(
    docs as Parameters<typeof aggregateMyDeckStats>[0],
    userId,
    origin
  )

  let eventsWithReportedRounds = 0
  for (const doc of docs) {
    const tor =
      (doc as { tournamentOrigin?: string }).tournamentOrigin === 'custom'
        ? 'custom'
        : 'official'
    if (origin === 'official' && tor !== 'official') continue
    if (origin === 'custom' && tor !== 'custom') continue
    const parts = doc.participants ?? []
    const mine = parts.find(
      (p: { userId?: unknown }) =>
        p?.userId != null && String(p.userId) === userId
    ) as { matchRounds?: unknown[] } | undefined
    const n = Array.isArray(mine?.matchRounds) ? mine.matchRounds.length : 0
    if (n > 0) eventsWithReportedRounds++
  }

  return {
    origin,
    myDecks,
    eventsScanned: docs.length,
    eventsWithReportedRounds
  }
}

export async function buildMatchupStatsDeckDetail(
  userId: string,
  uid: mongoose.Types.ObjectId,
  origin: TournamentOriginFilter,
  myDeckKey: string
): Promise<MatchupStatsDeckDetailPayload> {
  const docs = await loadMatchupEvents(uid, origin, myDeckKey)
  const opponents = aggregateOpponentMatchupsForMyDeck(
    docs as Parameters<typeof aggregateOpponentMatchupsForMyDeck>[0],
    userId,
    origin,
    myDeckKey
  )
  const myDeckSlugs =
    myDeckKey === '__empty__'
      ? []
      : myDeckSlugsDisplayOrderFromEvents(
          docs as Parameters<typeof aggregateMyDeckStats>[0],
          userId,
          myDeckKey
        )

  return {
    origin,
    view: 'deck-detail',
    myDeckKey,
    myDeckSlugs,
    opponents,
    eventsScanned: docs.length
  }
}

async function readCachedPayload(
  userId: mongoose.Types.ObjectId,
  view: MatchupStatsCacheView,
  origin: TournamentOriginFilter,
  myDeckKey: string
): Promise<Record<string, unknown> | null> {
  const row = await MatchupStatsCache.findOne({
    userId,
    view,
    origin,
    myDeckKey
  })
    .select('payload')
    .lean<{ payload?: Record<string, unknown> } | null>()
  return row?.payload ?? null
}

async function persistCachedPayload(
  userId: mongoose.Types.ObjectId,
  view: MatchupStatsCacheView,
  origin: TournamentOriginFilter,
  myDeckKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  await MatchupStatsCache.updateOne(
    { userId, view, origin, myDeckKey },
    { $set: { payload, builtAt: new Date() } },
    { upsert: true }
  )
}

export async function getOrBuildMatchupStatsOverview(
  userId: string,
  uid: mongoose.Types.ObjectId,
  origin: TournamentOriginFilter
): Promise<MatchupStatsOverviewPayload> {
  const cached = await readCachedPayload(uid, 'overview', origin, '')
  if (isOverviewPayload(cached)) return cached

  const payload = await buildMatchupStatsOverview(userId, uid, origin)
  await persistCachedPayload(uid, 'overview', origin, '', payload)
  return payload
}

export async function getOrBuildMatchupStatsDeckDetail(
  userId: string,
  uid: mongoose.Types.ObjectId,
  origin: TournamentOriginFilter,
  myDeckKey: string
): Promise<MatchupStatsDeckDetailPayload> {
  const key = cacheDeckKey(myDeckKey)
  const cached = await readCachedPayload(uid, 'deck-detail', origin, key)
  if (isDeckDetailPayload(cached) && cached.myDeckKey === key) return cached

  const payload = await buildMatchupStatsDeckDetail(userId, uid, origin, key)
  await persistCachedPayload(uid, 'deck-detail', origin, key, payload)
  return payload
}

export async function invalidateMatchupStatsCacheForUser(
  userId: string
): Promise<void> {
  const id = userId.trim()
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return
  await MatchupStatsCache.deleteMany({
    userId: new mongoose.Types.ObjectId(id)
  })
}

/** Tras cerrar/sync TDF: rivales en snapshots pueden cambiar para todos los inscritos. */
export async function invalidateMatchupStatsCacheForEvent(
  eventId: string
): Promise<void> {
  const id = eventId.trim()
  if (!id) return

  const doc = await WeeklyEvent.findById(id)
    .select('participants.userId')
    .lean<{ participants?: { userId?: unknown }[] } | null>()
  if (!doc?.participants?.length) return

  const userOids = [
    ...new Set(
      doc.participants
        .map(p => (p.userId != null ? String(p.userId).trim() : ''))
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id))
    )
  ]
  if (userOids.length === 0) return

  await MatchupStatsCache.deleteMany({ userId: { $in: userOids } })
}
