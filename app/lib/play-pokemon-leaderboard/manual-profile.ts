import {
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'

export type PlayPokemonManualProfile = {
  championshipPoints: number | null
  championshipRank: number | null
  playPoints: number | null
  division: PlayPokemonLeaderboardDivision | null
}

export function parseOptionalNonNegativeInt(
  value: unknown,
  max: number
): number | null | 'invalid' {
  if (value === null || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0 || value > max) return 'invalid'
    return value
  }
  if (typeof value !== 'string') return 'invalid'
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return 'invalid'
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 0 || n > max) return 'invalid'
  return n
}

export function parseOptionalPositiveInt(
  value: unknown,
  max: number
): number | null | 'invalid' {
  if (value === null || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1 || value > max) return 'invalid'
    return value
  }
  if (typeof value !== 'string') return 'invalid'
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return 'invalid'
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1 || n > max) return 'invalid'
  return n
}

export function parsePlayPokemonDivision(
  value: unknown
): PlayPokemonLeaderboardDivision | null | 'invalid' {
  if (value === null || value === '') return null
  if (typeof value !== 'string') return 'invalid'
  const v = value.trim().toLowerCase()
  if (!v) return null
  return (PLAY_POKEMON_LEADERBOARD_DIVISIONS as readonly string[]).includes(v)
    ? (v as PlayPokemonLeaderboardDivision)
    : 'invalid'
}

export function hasManualPlayPokemonProfile(
  input: PlayPokemonManualProfile
): boolean {
  return (
    input.championshipPoints != null ||
    input.championshipRank != null ||
    input.playPoints != null ||
    input.division != null
  )
}
