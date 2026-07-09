import {
  playPokemonLeaderboardEnabled,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import { readPlayPokemonLinkedFromUser } from '@/lib/play-pokemon-leaderboard/linked-championship-points'
import { hasManualPlayPokemonProfile } from '@/lib/play-pokemon-leaderboard/manual-profile'

const DIVISION_LABELS: Record<PlayPokemonLeaderboardDivision, string> = {
  masters: 'Master',
  seniors: 'Senior',
  juniors: 'Junior'
}

export type PublicPlayPokemonRankBadge = {
  rank: number
  championshipPoints: number
  playPoints?: number
  divisionLabel?: string
  seasonLabel?: string
  linkedDisplayName?: string
}

export function buildPublicPlayPokemonRankFromUser(user: {
  playPokemonChampionshipPoints?: number | null
  playPokemonChampionshipRank?: number | null
  playPokemonPlayPoints?: number | null
  playPokemonDivision?: PlayPokemonLeaderboardDivision | null
  playPokemonLinkedDisplayName?: string | null
  playPokemonLeaderboardUpdatedAt?: Date | string | null
  playPokemonSeasonLabel?: string | null
  playPokemonRankPublic?: boolean | null
  name?: string
}): PublicPlayPokemonRankBadge | null {
  if (!playPokemonLeaderboardEnabled()) return null
  if (user.playPokemonRankPublic !== true) return null

  const linked = readPlayPokemonLinkedFromUser(user)
  if (!hasManualPlayPokemonProfile(linked)) return null
  if (linked.championshipRank == null || linked.championshipPoints == null) {
    return null
  }

  return {
    rank: linked.championshipRank,
    championshipPoints: linked.championshipPoints,
    playPoints: linked.playPoints ?? undefined,
    divisionLabel: linked.division
      ? DIVISION_LABELS[linked.division]
      : undefined,
    seasonLabel:
      user.playPokemonSeasonLabel?.trim() || linked.seasonLabel || undefined,
    linkedDisplayName: linked.displayName
  }
}
