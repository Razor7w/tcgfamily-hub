import {
  playPokemonLeaderboardPeriod,
  playPokemonLeaderboardSeasonLabel,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import { hasManualPlayPokemonProfile } from '@/lib/play-pokemon-leaderboard/manual-profile'
import { readPlayPokemonLinkedFromUser } from '@/lib/play-pokemon-leaderboard/linked-championship-points'
import type { PlayPokemonLeaderboardRow } from '@/lib/play-pokemon-leaderboard/types'

export type PlayPokemonSeasonHistoryEntry = {
  period: string
  seasonLabel: string
  division: PlayPokemonLeaderboardDivision
  rank: number
  championshipPoints: number
  playPoints: number
  linkedDisplayName: string
  leaderboardUpdatedAt?: string
  archivedAt: string
}

export type PlayPokemonSeasonHistoryEntryDoc = Omit<
  PlayPokemonSeasonHistoryEntry,
  'leaderboardUpdatedAt' | 'archivedAt'
> & {
  leaderboardUpdatedAt?: Date
  archivedAt: Date
}

const MAX_HISTORY_ENTRIES = 50

type UserPlayPokemonFields = {
  playPokemonChampionshipPoints?: number | null
  playPokemonChampionshipRank?: number | null
  playPokemonPlayPoints?: number | null
  playPokemonDivision?: PlayPokemonLeaderboardDivision | null
  playPokemonLinkedDisplayName?: string | null
  playPokemonLeaderboardUpdatedAt?: Date | null
  playPokemonSeasonPeriod?: string | null
  playPokemonSeasonLabel?: string | null
  playPokemonHistory?: PlayPokemonSeasonHistoryEntryDoc[]
}

export function serializePlayPokemonHistoryEntry(
  entry: PlayPokemonSeasonHistoryEntryDoc
): PlayPokemonSeasonHistoryEntry {
  return {
    period: entry.period,
    seasonLabel: entry.seasonLabel,
    division: entry.division,
    rank: entry.rank,
    championshipPoints: entry.championshipPoints,
    playPoints: entry.playPoints,
    linkedDisplayName: entry.linkedDisplayName,
    leaderboardUpdatedAt:
      entry.leaderboardUpdatedAt instanceof Date
        ? entry.leaderboardUpdatedAt.toISOString()
        : undefined,
    archivedAt: entry.archivedAt.toISOString()
  }
}

function buildHistoryEntryFromUser(
  user: UserPlayPokemonFields,
  archivedAt: Date
): PlayPokemonSeasonHistoryEntryDoc | null {
  const linked = readPlayPokemonLinkedFromUser(user)
  if (!hasManualPlayPokemonProfile(linked)) return null
  if (
    linked.championshipRank == null ||
    linked.championshipPoints == null ||
    linked.playPoints == null ||
    !linked.division
  ) {
    return null
  }

  return {
    period: user.playPokemonSeasonPeriod ?? playPokemonLeaderboardPeriod(),
    seasonLabel:
      user.playPokemonSeasonLabel ?? playPokemonLeaderboardSeasonLabel(),
    division: linked.division,
    rank: linked.championshipRank,
    championshipPoints: linked.championshipPoints,
    playPoints: linked.playPoints,
    linkedDisplayName: linked.displayName ?? '',
    leaderboardUpdatedAt:
      user.playPokemonLeaderboardUpdatedAt instanceof Date
        ? user.playPokemonLeaderboardUpdatedAt
        : undefined,
    archivedAt
  }
}

export function archiveCurrentPlayPokemonLink(
  user: UserPlayPokemonFields & {
    playPokemonHistory?: PlayPokemonSeasonHistoryEntryDoc[]
  },
  archivedAt: Date = new Date()
): void {
  const entry = buildHistoryEntryFromUser(user, archivedAt)
  if (!entry) return

  if (!user.playPokemonHistory) {
    user.playPokemonHistory = []
  }
  user.playPokemonHistory.unshift(entry)
  if (user.playPokemonHistory.length > MAX_HISTORY_ENTRIES) {
    user.playPokemonHistory = user.playPokemonHistory.slice(
      0,
      MAX_HISTORY_ENTRIES
    )
  }
}

export function applyPlayPokemonLinkRow(
  user: UserPlayPokemonFields & {
    playPokemonHistory?: PlayPokemonSeasonHistoryEntryDoc[]
  },
  input: {
    row: PlayPokemonLeaderboardRow
    division: PlayPokemonLeaderboardDivision
  }
): void {
  const linked = readPlayPokemonLinkedFromUser(user)
  if (hasManualPlayPokemonProfile(linked)) {
    archiveCurrentPlayPokemonLink(user)
  }

  user.playPokemonChampionshipPoints = input.row.primary_point_total
  user.playPokemonChampionshipRank = input.row.rank
  user.playPokemonPlayPoints = input.row.secondary_point_total
  user.playPokemonDivision = input.division
  user.playPokemonLinkedDisplayName = input.row.display_name
  user.playPokemonLeaderboardUpdatedAt = new Date(input.row.calculation_date)
  user.playPokemonSeasonPeriod = playPokemonLeaderboardPeriod()
  user.playPokemonSeasonLabel = playPokemonLeaderboardSeasonLabel()
}

export function readPlayPokemonHistoryFromUser(
  user:
    | { playPokemonHistory?: PlayPokemonSeasonHistoryEntryDoc[] }
    | null
    | undefined
): PlayPokemonSeasonHistoryEntry[] {
  const rows = user?.playPokemonHistory ?? []
  return rows.map(serializePlayPokemonHistoryEntry)
}
