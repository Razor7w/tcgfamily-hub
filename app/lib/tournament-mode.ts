import type { TournamentMode } from '@/models/WeeklyEvent'

export function normalizeTournamentMode(raw: unknown): TournamentMode {
  return raw === 'online' ? 'online' : 'in_person'
}

/** `undefined` = omitir en PATCH; `null` inválido → null; default presencial. */
export function readTournamentMode(
  v: unknown
): TournamentMode | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return 'in_person'
  if (v === 'in_person' || v === 'online') return v
  return null
}

export function tournamentModeLabel(mode: TournamentMode): string {
  return mode === 'online' ? 'Online' : 'Presencial'
}

export function eventSupportsMatchChat(tournamentMode: unknown): boolean {
  return normalizeTournamentMode(tournamentMode) === 'online'
}
