export const TEAM_FRIENDLY_LINEUP_SIZES = [2, 3] as const
export type TeamFriendlyLineupSize = (typeof TEAM_FRIENDLY_LINEUP_SIZES)[number]

export const TEAM_FRIENDLY_MIN_LINEUP_SIZE = 2
export const TEAM_FRIENDLY_MAX_LINEUP_SIZE = 3
export const TEAM_FRIENDLY_DEFAULT_LINEUP_SIZE: TeamFriendlyLineupSize = 2
export const TEAM_FRIENDLY_MAX_DUEL_COUNT =
  TEAM_FRIENDLY_MAX_LINEUP_SIZE * TEAM_FRIENDLY_MAX_LINEUP_SIZE

export function isFriendlyLineupSize(
  value: unknown
): value is TeamFriendlyLineupSize {
  return value === 2 || value === 3
}

export function friendlyLineupSlots(
  size: TeamFriendlyLineupSize
): readonly number[] {
  return Array.from({ length: size }, (_, index) => index)
}

export function friendlyDuelCount(size: TeamFriendlyLineupSize): number {
  return size * size
}

export function friendlyIntramuralMinMembers(
  size: TeamFriendlyLineupSize
): number {
  return size * 2
}

export function resolveFriendlyLineupSize(match: {
  lineupSize?: unknown
  challengerLineup?: unknown[] | null
}): TeamFriendlyLineupSize {
  if (isFriendlyLineupSize(match.lineupSize)) return match.lineupSize
  const len = Array.isArray(match.challengerLineup)
    ? match.challengerLineup.length
    : 0
  if (isFriendlyLineupSize(len)) return len
  return 3
}

export function parseFriendlyLineupSizeInput(
  raw: unknown
):
  | { ok: true; lineupSize: TeamFriendlyLineupSize }
  | { ok: false; error: string } {
  if (isFriendlyLineupSize(raw)) {
    return { ok: true, lineupSize: raw }
  }
  return { ok: false, error: 'Formato inválido (elige 2v2 o 3v3)' }
}

export const TEAM_FRIENDLY_POINTS_PER_WIN = 3
export const TEAM_FRIENDLY_POINTS_PER_TIE = 1
export const TEAM_FRIENDLY_CHALLENGE_EXPIRY_DAYS = 14

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

export const TEAM_FRIENDLY_INTRAMURAL_SIDE_LABELS = {
  challenger: 'Escuadra A',
  opponent: 'Escuadra B'
} as const

export function friendlyLineupSizeLabel(size: TeamFriendlyLineupSize): string {
  return `${size}v${size}`
}

export function isFriendlyMatchIntramural(match: {
  isIntramural?: boolean
  challengerTeamId: unknown
  opponentTeamId: unknown
}): boolean {
  if (match.isIntramural === true) return true
  return String(match.challengerTeamId) === String(match.opponentTeamId)
}
