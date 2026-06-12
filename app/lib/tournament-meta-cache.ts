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
  await WeeklyEvent.updateOne({ _id: id }, { $unset: { tournamentMetaCache: 1 } })
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

/** Tras mutar un torneo: recalcula meta si ya es público; si no, limpia cache. */
export async function syncTournamentMetaCacheAfterEventMutation(
  eventId: string,
  doc: {
    kind?: string
    game?: string
    state?: string
    tournamentOrigin?: string
  }
): Promise<void> {
  if (doc.kind !== 'tournament' || doc.game !== 'pokemon') return
  if (isPokemonTournamentMetaEligible(doc)) {
    await refreshTournamentMetaCache(eventId)
  } else {
    await invalidateTournamentMetaCache(eventId)
  }
}
