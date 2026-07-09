import type { PlayPokemonLeaderboardDivision } from '@/lib/play-pokemon-leaderboard/constants'

export type PlayPokemonLeaderboardRow = {
  ranking_id: string
  region: string
  region_type: string
  division: PlayPokemonLeaderboardDivision
  product: string
  period: string
  rank: number
  ranking_order: number
  primary_point_type: string
  primary_point_total: number
  secondary_point_type: string
  secondary_point_total: number
  calculation_date: string
  player_country: string
  player_country_code: string
  display_name: string
}

export type PlayPokemonLeaderboardApiPage = {
  results: PlayPokemonLeaderboardRow[]
  count: number
  next: string | null
  previous: string | null
  run_time?: string
}

export type PlayPokemonChileLeaderboardRow = {
  rank: number
  displayName: string
  championshipPoints: number
  playPoints: number
  playerCountryCode: string
  calculationDate: string
}

export type PlayPokemonChileLeaderboardResponse = {
  enabled: boolean
  division: PlayPokemonLeaderboardDivision
  region: string
  regionType: string
  period: string
  page: number
  pageSize: number
  count: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  calculationDate?: string
  officialLeaderboardUrl: string
  /** Término de búsqueda aplicado (vacío = sin filtro). */
  search?: string
  rows: PlayPokemonChileLeaderboardRow[]
}

export type PlayPokemonChampionshipPointsLookup = {
  enabled: boolean
  found: boolean
  searchedAs: string
  displayName?: string
  division?: PlayPokemonLeaderboardDivision
  rank?: number
  primaryPointTotal?: number
  secondaryPointTotal?: number
  secondaryPointType?: string
  playerCountryCode?: string
  calculationDate?: string
  period?: string
  region?: string
  regionType?: string
  leaderboardUrl?: string
  notFoundReason?: 'not_linked' | 'disabled'
  /** Valores vinculados desde Ranking Chile. */
  manual?: {
    championshipPoints: number | null
    championshipRank: number | null
    playPoints: number | null
    division: PlayPokemonLeaderboardDivision | null
  }
  /** linked = fila en Ranking Chile; none = sin vincular. */
  source?: 'linked' | 'none'
  chileLeaderboardPath?: string
  seasonPeriod?: string
  seasonLabel?: string
  rankPublic?: boolean
  history?: Array<{
    period: string
    seasonLabel: string
    division: PlayPokemonLeaderboardDivision
    rank: number
    championshipPoints: number
    playPoints: number
    linkedDisplayName: string
    leaderboardUpdatedAt?: string
    archivedAt: string
  }>
}
