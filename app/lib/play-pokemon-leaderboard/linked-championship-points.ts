import {
  playPokemonLeaderboardPublicUrl,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import {
  hasManualPlayPokemonProfile,
  type PlayPokemonManualProfile
} from '@/lib/play-pokemon-leaderboard/manual-profile'
import { PLAY_POKEMON_CHILE_LEADERBOARD_PATH } from '@/lib/play-pokemon-leaderboard/constants'
import type { PlayPokemonChampionshipPointsLookup } from '@/lib/play-pokemon-leaderboard/types'
import {
  readPlayPokemonHistoryFromUser,
  type PlayPokemonSeasonHistoryEntry,
  type PlayPokemonSeasonHistoryEntryDoc
} from '@/lib/play-pokemon-leaderboard/season-history'

export type PlayPokemonLinkedUserSnapshot = PlayPokemonManualProfile & {
  displayName?: string
  updatedAt?: string
  seasonPeriod?: string
  seasonLabel?: string
  rankPublic?: boolean
  history?: PlayPokemonSeasonHistoryEntry[]
}

export function readPlayPokemonLinkedFromUser(user: {
  name?: string
  playPokemonLinkedDisplayName?: string | null
  playPokemonChampionshipPoints?: number | null
  playPokemonChampionshipRank?: number | null
  playPokemonPlayPoints?: number | null
  playPokemonDivision?: PlayPokemonLeaderboardDivision | null
  playPokemonLeaderboardUpdatedAt?: Date | string | null
  playPokemonSeasonPeriod?: string | null
  playPokemonSeasonLabel?: string | null
  playPokemonRankPublic?: boolean | null
  playPokemonHistory?: unknown
}): PlayPokemonLinkedUserSnapshot {
  const linkedName = user.playPokemonLinkedDisplayName?.trim()
  return {
    championshipPoints:
      typeof user.playPokemonChampionshipPoints === 'number'
        ? user.playPokemonChampionshipPoints
        : null,
    championshipRank:
      typeof user.playPokemonChampionshipRank === 'number'
        ? user.playPokemonChampionshipRank
        : null,
    playPoints:
      typeof user.playPokemonPlayPoints === 'number'
        ? user.playPokemonPlayPoints
        : null,
    division: user.playPokemonDivision ?? null,
    displayName: linkedName || user.name?.trim() || undefined,
    updatedAt:
      user.playPokemonLeaderboardUpdatedAt instanceof Date
        ? user.playPokemonLeaderboardUpdatedAt.toISOString()
        : typeof user.playPokemonLeaderboardUpdatedAt === 'string'
          ? user.playPokemonLeaderboardUpdatedAt
          : undefined,
    seasonPeriod: user.playPokemonSeasonPeriod?.trim() || undefined,
    seasonLabel: user.playPokemonSeasonLabel?.trim() || undefined,
    rankPublic: user.playPokemonRankPublic === true,
    history: readPlayPokemonHistoryFromUser(
      user as { playPokemonHistory?: PlayPokemonSeasonHistoryEntryDoc[] }
    )
  }
}

export function buildLinkedChampionshipPointsPayload(input: {
  enabled: boolean
  linked: PlayPokemonLinkedUserSnapshot
}): PlayPokemonChampionshipPointsLookup {
  const { enabled, linked } = input
  const leaderboardUrl = playPokemonLeaderboardPublicUrl()

  if (!enabled) {
    return {
      enabled: false,
      found: false,
      searchedAs: '',
      notFoundReason: 'disabled',
      chileLeaderboardPath: PLAY_POKEMON_CHILE_LEADERBOARD_PATH,
      source: 'none'
    }
  }

  if (!hasManualPlayPokemonProfile(linked)) {
    return {
      enabled: true,
      found: false,
      searchedAs: linked.displayName ?? '',
      notFoundReason: 'not_linked',
      leaderboardUrl,
      chileLeaderboardPath: PLAY_POKEMON_CHILE_LEADERBOARD_PATH,
      source: 'none',
      rankPublic: linked.rankPublic,
      history: linked.history
    }
  }

  return {
    enabled: true,
    found: true,
    searchedAs: linked.displayName ?? '',
    displayName: linked.displayName,
    division: linked.division ?? undefined,
    rank: linked.championshipRank ?? undefined,
    primaryPointTotal: linked.championshipPoints ?? undefined,
    secondaryPointTotal: linked.playPoints ?? undefined,
    playerCountryCode: 'CL',
    region: 'CL',
    regionType: 'country',
    calculationDate: linked.updatedAt,
    leaderboardUrl,
    chileLeaderboardPath: PLAY_POKEMON_CHILE_LEADERBOARD_PATH,
    source: 'linked',
    manual: {
      championshipPoints: linked.championshipPoints,
      championshipRank: linked.championshipRank,
      playPoints: linked.playPoints,
      division: linked.division
    },
    seasonPeriod: linked.seasonPeriod,
    seasonLabel: linked.seasonLabel,
    rankPublic: linked.rankPublic,
    history: linked.history
  }
}
