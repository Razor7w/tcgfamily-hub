import type { RoundSnapshotLean } from '@/lib/match-rounds-with-snapshots'
import {
  attachTiebreakersToFullPublicStandings,
  buildTournamentStandingsPublic,
  PUBLIC_STANDINGS_FULL_MAX
} from '@/lib/weekly-event-public'
import {
  weeklyEventDetailBaseProjection,
  weeklyEventRoundSnapshotsWltProjection
} from '@/lib/weekly-event-query-projections'
import WeeklyEvent from '@/models/WeeklyEvent'

export type StandingsFullCategoryCache = {
  categoryIndex: number
  rows: {
    place: number
    displayName: string
    owp?: number | null
    oowp?: number | null
  }[]
}

export function isStandingsFullCacheEligible(doc: {
  kind?: string
  game?: string
  state?: string
}): boolean {
  return (
    doc.kind === 'tournament' && doc.game === 'pokemon' && doc.state === 'close'
  )
}

export function isStoredStandingsFullCache(
  value: unknown
): value is StandingsFullCategoryCache[] {
  return (
    Array.isArray(value) &&
    value.every(
      c =>
        c &&
        typeof c === 'object' &&
        typeof (c as StandingsFullCategoryCache).categoryIndex === 'number' &&
        Array.isArray((c as StandingsFullCategoryCache).rows)
    )
  )
}

async function loadLeanForStandingsFull(eventId: string) {
  const doc = await WeeklyEvent.findById(eventId)
    .select({
      ...weeklyEventDetailBaseProjection,
      ...weeklyEventRoundSnapshotsWltProjection
    })
    .lean<{
      tournamentStandings?: Parameters<typeof buildTournamentStandingsPublic>[0]
      participants?: {
        displayName: string
        popId?: string
        wins?: unknown
        losses?: unknown
        ties?: unknown
      }[]
      roundSnapshots?: RoundSnapshotLean[]
    } | null>()
  return doc
}

export function buildStandingsFullByCategoryFromLean(
  doc: NonNullable<Awaited<ReturnType<typeof loadLeanForStandingsFull>>>
): StandingsFullCategoryCache[] {
  const parts = doc.participants ?? []
  const standingsPublic = buildTournamentStandingsPublic(
    doc.tournamentStandings,
    parts,
    '',
    undefined,
    { maxRowsPerCategory: PUBLIC_STANDINGS_FULL_MAX }
  )
  return attachTiebreakersToFullPublicStandings(
    standingsPublic?.standingsTopByCategory ?? [],
    doc.roundSnapshots,
    parts
  )
}

export async function invalidateTournamentStandingsFullCache(
  eventId: string
): Promise<void> {
  const id = eventId.trim()
  if (!id) return
  await WeeklyEvent.updateOne(
    { _id: id },
    { $unset: { tournamentStandingsFullCache: 1 } }
  )
}

export async function refreshTournamentStandingsFullCache(
  eventId: string
): Promise<StandingsFullCategoryCache[] | null> {
  const id = eventId.trim()
  if (!id) return null

  const gate = await WeeklyEvent.findById(id).select('kind game state').lean()
  if (!gate || !isStandingsFullCacheEligible(gate)) {
    await invalidateTournamentStandingsFullCache(id)
    return null
  }

  const doc = await loadLeanForStandingsFull(id)
  if (!doc) return null

  const standingsFullByCategory = buildStandingsFullByCategoryFromLean(doc)
  await WeeklyEvent.updateOne(
    { _id: id },
    { $set: { tournamentStandingsFullCache: standingsFullByCategory } }
  )
  return standingsFullByCategory
}

export async function getOrBuildTournamentStandingsFullCache(
  eventId: string
): Promise<StandingsFullCategoryCache[] | null> {
  const id = eventId.trim()
  if (!id) return null

  const gate = await WeeklyEvent.findById(id)
    .select('tournamentStandingsFullCache kind game state')
    .lean<{
      tournamentStandingsFullCache?: unknown
      kind?: string
      game?: string
      state?: string
    } | null>()

  if (!gate || !isStandingsFullCacheEligible(gate)) return null

  if (isStoredStandingsFullCache(gate.tournamentStandingsFullCache)) {
    return gate.tournamentStandingsFullCache
  }

  return refreshTournamentStandingsFullCache(id)
}
