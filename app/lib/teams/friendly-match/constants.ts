export const TEAM_FRIENDLY_LINEUP_SIZE = 3
export const TEAM_FRIENDLY_POINTS_PER_WIN = 3
export const TEAM_FRIENDLY_POINTS_PER_TIE = 1
export const TEAM_FRIENDLY_CHALLENGE_EXPIRY_DAYS = 14
export const TEAM_FRIENDLY_DUEL_COUNT =
  TEAM_FRIENDLY_LINEUP_SIZE * TEAM_FRIENDLY_LINEUP_SIZE

export const TEAM_FRIENDLY_MATCH_STATUSES = [
  'pending',
  'declined',
  'cancelled',
  'in_progress',
  'completed',
  'disputed'
] as const

export type TeamFriendlyMatchStatus =
  (typeof TEAM_FRIENDLY_MATCH_STATUSES)[number]

export const TEAM_FRIENDLY_DUEL_STATUSES = [
  'pending_reports',
  'confirmed',
  'disputed'
] as const

export type TeamFriendlyDuelStatus =
  (typeof TEAM_FRIENDLY_DUEL_STATUSES)[number]

export const TEAM_FRIENDLY_DUEL_STATUS_LABELS: Record<
  TeamFriendlyDuelStatus,
  string
> = {
  pending_reports: 'Pendiente',
  confirmed: 'Confirmado',
  disputed: 'En conflicto'
}

export type TeamFriendlyDuelReport = 'win' | 'loss' | 'tie'

export const TEAM_FRIENDLY_DUEL_REPORT_VALUES = [
  'win',
  'loss',
  'tie'
] as const satisfies readonly TeamFriendlyDuelReport[]

/** Atlas/manual edits sometimes leave `""`; treat as sin reporte. */
export function normalizeFriendlyDuelReport(
  raw: TeamFriendlyDuelReport | string | null | undefined
): TeamFriendlyDuelReport | null {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  return (TEAM_FRIENDLY_DUEL_REPORT_VALUES as readonly string[]).includes(t)
    ? (t as TeamFriendlyDuelReport)
    : null
}

export const TEAM_FRIENDLY_DUEL_REPORT_LABELS: Record<
  TeamFriendlyDuelReport,
  string
> = {
  win: 'ganó',
  loss: 'perdió',
  tie: 'empate'
}

export const TEAM_FRIENDLY_MATCH_STATUS_LABELS: Record<
  TeamFriendlyMatchStatus,
  string
> = {
  pending: 'Pendiente',
  declined: 'Rechazado',
  cancelled: 'Cancelado',
  in_progress: 'En juego',
  completed: 'Finalizado',
  disputed: 'En disputa'
}
