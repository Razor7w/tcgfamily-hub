import {
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  playPokemonLeaderboardPeriod,
  playPokemonLeaderboardRegion,
  playPokemonLeaderboardRegionType,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import { fetchPlayPokemonLeaderboardSnapshot } from '@/lib/play-pokemon-leaderboard/fetch-leaderboard-snapshot'
import { normalizePlayPokemonDisplayName } from '@/lib/play-pokemon-leaderboard/normalize-display-name'
import type { PlayPokemonLeaderboardRow } from '@/lib/play-pokemon-leaderboard/types'

export function findPlayPokemonChileLeaderboardRow(input: {
  division: PlayPokemonLeaderboardDivision
  rank: number
  displayName: string
}): Promise<PlayPokemonLeaderboardRow | null> {
  const period = playPokemonLeaderboardPeriod()
  const region = playPokemonLeaderboardRegion()
  const regionType = playPokemonLeaderboardRegionType()
  const targetName = normalizePlayPokemonDisplayName(input.displayName)

  if (!targetName || !Number.isInteger(input.rank) || input.rank < 1) {
    return Promise.resolve(null)
  }

  return fetchPlayPokemonLeaderboardSnapshot({
    period,
    region,
    regionType,
    division: input.division
  }).then(
    rows =>
      rows.find(
        row =>
          row.rank === input.rank &&
          normalizePlayPokemonDisplayName(row.display_name) === targetName
      ) ?? null
  )
}

export function parseLinkDivision(
  value: unknown
): PlayPokemonLeaderboardDivision | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  return (PLAY_POKEMON_LEADERBOARD_DIVISIONS as readonly string[]).includes(v)
    ? (v as PlayPokemonLeaderboardDivision)
    : null
}
