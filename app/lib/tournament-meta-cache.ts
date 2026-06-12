import type { RoundSnapshotLean } from '@/lib/match-rounds-with-snapshots'
import {
  buildTournamentMetaPayload,
  type TournamentMetaPayload
} from '@/lib/tournament-meta-build'
import { canExposeParticipantDecksToOthers } from '@/lib/weekly-events'
import {
  weeklyEventMetaProjection,
  weeklyEventMetaSnapshotProjection
} from '@/lib/weekly-event-query-projections'
import { invalidateMatchupStatsCacheForEvent } from '@/lib/matchup-stats-cache'
import { syncLeaguePublicCacheForEvent } from '@/lib/league-public-cache'
import { refreshTournamentStandingsFullCache } from '@/lib/tournament-standings-full-cache'
import WeeklyEvent from '@/models/WeeklyEvent'

export function isPokemonTournamentMetaEligible(doc: {
  kind?: string
  game?: string
  state?: string
  tournamentOrigin?: string
}): boolean {
  if (doc.kind !== 'tournament' || doc.game !== 'pokemon') return false
  return canExposeParticipantDecksToOthers({
    state: doc.state,
    tournamentOrigin: doc.tournamentOrigin
  })
}

export function isStoredTournamentMetaPayload(
  value: unknown
): value is TournamentMetaPayload {
  if (!value || typeof value !== 'object') return false
  const o = value as TournamentMetaPayload
  return (
    Boolean(o.event) &&
    Array.isArray(o.participants) &&
    Array.isArray(o.metagame) &&
    Boolean(o.standings)
  )
}

async function loadWeeklyEventLeanForMeta(
  eventId: string
): Promise<Record<string, unknown> | null> {
  const doc = await WeeklyEvent.findById(eventId)
    .select(weeklyEventMetaProjection)
    .lean()
  if (!doc) return null

  const tournamentOrigin =
    (doc as { tournamentOrigin?: string }).tournamentOrigin === 'custom'
      ? 'custom'
      : 'official'

  if (tournamentOrigin === 'official') {
    const snapLean = await WeeklyEvent.findById(eventId)
      .select(weeklyEventMetaSnapshotProjection)
      .lean<{ roundSnapshots?: RoundSnapshotLean[] } | null>()
    ;(doc as { roundSnapshots?: RoundSnapshotLean[] }).roundSnapshots =
      snapLean?.roundSnapshots ?? []
  } else {
    ;(doc as { roundSnapshots?: RoundSnapshotLean[] }).roundSnapshots = []
  }

  return doc as Record<string, unknown>
}

/** Elimina meta precalculada (tras mutaciones que cambian participantes/snapshots/standings). */
export async function invalidateTournamentMetaCache(
  eventId: string
): Promise<void> {
  const id = eventId.trim()
  if (!id) return
  await WeeklyEvent.updateOne(
    { _id: id },
    { $unset: { tournamentMetaCache: 1, tournamentStandingsFullCache: 1 } }
  )
}

/** Recalcula y persiste meta (p. ej. al cerrar torneo). No hace nada si no aplica. */
export async function refreshTournamentMetaCache(
  eventId: string
): Promise<TournamentMetaPayload | null> {
  const id = eventId.trim()
  if (!id) return null

  const gate = await WeeklyEvent.findById(id)
    .select('kind game state tournamentOrigin')
    .lean()
  if (!gate || !isPokemonTournamentMetaEligible(gate)) {
    await invalidateTournamentMetaCache(id)
    return null
  }

  const doc = await loadWeeklyEventLeanForMeta(id)
  if (!doc) return null

  const payload = await buildTournamentMetaPayload(
    doc as Parameters<typeof buildTournamentMetaPayload>[0]
  )
  await WeeklyEvent.updateOne(
    { _id: id },
    { $set: { tournamentMetaCache: payload } }
  )
  return payload
}

/** Sirve cache en Mongo o construye, persiste y devuelve. */
export async function getOrBuildTournamentMetaCache(
  eventId: string
): Promise<TournamentMetaPayload | null> {
  const id = eventId.trim()
  if (!id) return null

  const gate = await WeeklyEvent.findById(id)
    .select('tournamentMetaCache kind game state tournamentOrigin')
    .lean<{
      tournamentMetaCache?: unknown
      kind?: string
      game?: string
      state?: string
      tournamentOrigin?: string
    } | null>()

  if (!gate || !isPokemonTournamentMetaEligible(gate)) return null

  if (isStoredTournamentMetaPayload(gate.tournamentMetaCache)) {
    return gate.tournamentMetaCache
  }

  return refreshTournamentMetaCache(id)
}

/** Tras mutar un torneo: invalida en caliente; rebuild solo si cerrado y público. */
export async function syncTournamentMetaCacheAfterEventMutation(
  eventId: string,
  doc: {
    kind?: string
    game?: string
    state?: string
    tournamentOrigin?: string
    leagueId?: unknown
  }
): Promise<void> {
  const leagueSync = syncLeaguePublicCacheForEvent(doc)

  if (doc.kind !== 'tournament' || doc.game !== 'pokemon') {
    await leagueSync
    return
  }

  if (doc.state === 'close' && isPokemonTournamentMetaEligible(doc)) {
    await Promise.all([refreshTournamentDerivedCaches(eventId), leagueSync])
  } else {
    await Promise.all([invalidateTournamentMetaCache(eventId), leagueSync])
  }
}

/** Tras cerrar torneo o import TDF: meta + standings full + liga en paralelo. */
export async function refreshTournamentDerivedCaches(
  eventId: string
): Promise<void> {
  const gate = await WeeklyEvent.findById(eventId)
    .select('kind game state tournamentOrigin leagueId')
    .lean()
  await Promise.all([
    refreshTournamentMetaCache(eventId),
    refreshTournamentStandingsFullCache(eventId),
    invalidateMatchupStatsCacheForEvent(eventId),
    gate ? syncLeaguePublicCacheForEvent(gate) : Promise.resolve()
  ])
}
