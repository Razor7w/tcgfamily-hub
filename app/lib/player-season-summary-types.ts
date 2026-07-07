import type { TournamentOriginFilter } from '@/lib/pokemon-matchup-stats'
import type { UserMatchRoundFlatRow } from '@/lib/pokemon-matchup-stats'

export type SeasonPeriod = 'all' | 'month' | 'quarter' | 'year'

export const SEASON_PERIOD_LABELS: Record<SeasonPeriod, string> = {
  month: 'Este mes',
  quarter: 'Este trimestre',
  year: 'Este año',
  all: 'Todo el historial'
}

/** Etiquetas cortas para filtros en pantallas estrechas. */
export const SEASON_PERIOD_SHORT_LABELS: Record<SeasonPeriod, string> = {
  month: 'Mes',
  quarter: 'Trim.',
  year: 'Año',
  all: 'Todo'
}

export const SEASON_TREND_LABELS: Record<
  Exclude<SeasonPeriod, 'all'>,
  string
> = {
  month: 'vs mes anterior',
  quarter: 'vs trimestre anterior',
  year: 'vs año anterior'
}

export type SeasonDeckRowDTO = {
  myDeckKey: string
  myDeckSlugs: string[]
  label: string
  decklistName: string | null
  listLabel: string | null
  wins: number
  losses: number
  ties: number
  roundsPlayed: number
  winRate: number | null
  lastPlayedAt: string
}

export type SeasonRecentRoundDTO = UserMatchRoundFlatRow & {
  myDeckLabel: string
  opponentDeckLabel: string
  decklistName: string | null
}

export type SeasonKpisDTO = {
  totalRounds: number
  globalWinRate: number | null
  principalDeck: {
    myDeckKey: string
    myDeckSlugs: string[]
    label: string
    decklistName: string | null
    roundsPlayed: number
  } | null
  tournamentsWithReport: number
  trends: {
    roundsDeltaPct: number | null
    winRateDeltaPts: number | null
  } | null
}

export type PlayerSeasonSummaryPayload = {
  period: SeasonPeriod
  origin: TournamentOriginFilter
  kpis: SeasonKpisDTO
  recentRounds: SeasonRecentRoundDTO[]
  topDecks: SeasonDeckRowDTO[]
  eventsScanned: number
}

export type PlayerSeasonRoundsPayload = {
  period: SeasonPeriod
  origin: TournamentOriginFilter
  rounds: SeasonRecentRoundDTO[]
  eventsScanned: number
}

export const STATS_RETURN_FROM_MI_CUENTA = 'mi-cuenta'

export function dashboardStatsHref(options?: {
  deckKey?: string
  fromMiCuenta?: boolean
}): string {
  const params = new URLSearchParams()
  if (options?.deckKey) params.set('deck', options.deckKey)
  if (options?.fromMiCuenta) params.set('from', STATS_RETURN_FROM_MI_CUENTA)
  const q = params.toString()
  return `/dashboard/estadisticas${q ? `?${q}` : ''}`
}

export function miCuentaPartidasHref(period: SeasonPeriod): string {
  return `/dashboard/mi-cuenta/partidas?period=${period}`
}

export function parseSeasonPeriod(raw: string | null): SeasonPeriod {
  if (raw === 'month' || raw === 'quarter' || raw === 'year' || raw === 'all') {
    return raw
  }
  return 'month'
}
