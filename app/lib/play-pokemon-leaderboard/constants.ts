export const PLAY_POKEMON_SPAR_BASE =
  'https://api.play.pokemon.com/services/spar/leaderboards/'

/** Periodo activo del leaderboard Play! Pokémon (World Championships cycle). */
export const DEFAULT_PLAY_POKEMON_LEADERBOARD_PERIOD =
  'a0a3bb4a4c7a75628526ebbc7eb61d26'

export const PLAY_POKEMON_LEADERBOARD_DIVISIONS = [
  'masters',
  'seniors',
  'juniors'
] as const

export type PlayPokemonLeaderboardDivision =
  (typeof PLAY_POKEMON_LEADERBOARD_DIVISIONS)[number]

export const PLAY_POKEMON_LEADERBOARD_PAGE_SIZE = 200

/** TTL del snapshot en memoria (actualización oficial ~semanal). */
export const PLAY_POKEMON_LEADERBOARD_CACHE_TTL_MS = 6 * 60 * 60 * 1000

export function playPokemonLeaderboardPeriod(): string {
  const fromEnv = process.env.PLAY_POKEMON_LEADERBOARD_PERIOD?.trim()
  return fromEnv || DEFAULT_PLAY_POKEMON_LEADERBOARD_PERIOD
}

/** Etiqueta legible de la temporada activa (p. ej. «2026»). */
export function playPokemonLeaderboardSeasonLabel(): string {
  return process.env.PLAY_POKEMON_LEADERBOARD_SEASON_LABEL?.trim() || '2026'
}

export function playPokemonLeaderboardEnabled(): boolean {
  const flag = process.env.PLAY_POKEMON_CHAMPIONSHIP_POINTS_ENABLED?.trim()
  if (flag === '0' || flag?.toLowerCase() === 'false') return false
  return true
}

export function playPokemonLeaderboardRegion(): string {
  return process.env.PLAY_POKEMON_LEADERBOARD_REGION?.trim() || 'CL'
}

export function playPokemonLeaderboardRegionType(): 'country' | 'zone' {
  const raw = process.env.PLAY_POKEMON_LEADERBOARD_REGION_TYPE?.trim()
  return raw === 'zone' ? 'zone' : 'country'
}

export function playPokemonLeaderboardPublicUrl(): string {
  return (
    process.env.PLAY_POKEMON_LEADERBOARD_PUBLIC_URL?.trim() ||
    'https://www.pokemon.com/us/play-pokemon/leaderboards/'
  )
}

export const PLAY_POKEMON_CHILE_LEADERBOARD_PATH = '/ranking-play-pokemon/chile'

/** Jugadores de Nexo que comparten su ranking vinculado. */
export const PLAY_POKEMON_COMMUNITY_RANKING_PATH =
  '/ranking-play-pokemon/comunidad'

export const PLAY_POKEMON_COMMUNITY_RANKING_PAGE_SIZE = 50

/** Valor de `storeId` para listar jugadores de todas las tiendas. */
export const PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID = 'all'
