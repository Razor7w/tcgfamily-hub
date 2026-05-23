import type { IDashboardModuleSettings } from '@/models/DashboardModuleSettings'

export const DEFAULT_TOURNAMENT_POINTS_DISPLAY_NAME = 'Puntos por torneo'

export const TOURNAMENT_POINTS_DISPLAY_NAME_MAX = 60

export type StoreCreditAdminSettings = {
  /** Importación CSV de saldo en /admin/puntos */
  csvEnabled: boolean
  /** Reparto y gestión de puntos por torneo */
  tournamentPointsEnabled: boolean
  /** Texto personalizado en BD; vacío = nombre por defecto */
  tournamentPointsCustomName: string
  /** Nombre mostrado en UI (resuelto) */
  tournamentPointsLabel: string
}

export const DEFAULT_STORE_CREDIT_ADMIN: StoreCreditAdminSettings = {
  csvEnabled: true,
  tournamentPointsEnabled: false,
  tournamentPointsCustomName: '',
  tournamentPointsLabel: DEFAULT_TOURNAMENT_POINTS_DISPLAY_NAME
}

export function resolveTournamentPointsDisplayName(
  raw?: string | null
): string {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (!t) return DEFAULT_TOURNAMENT_POINTS_DISPLAY_NAME
  return t.slice(0, TOURNAMENT_POINTS_DISPLAY_NAME_MAX)
}

export function normalizeTournamentPointsCustomName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, TOURNAMENT_POINTS_DISPLAY_NAME_MAX)
}

export function mergeStoreCreditAdmin(
  doc: Partial<
    Pick<
      IDashboardModuleSettings,
      | 'storeCreditCsvEnabled'
      | 'storeCreditTournamentPointsEnabled'
      | 'tournamentPointsEnabled'
      | 'tournamentPointsDisplayName'
    >
  > | null
): StoreCreditAdminSettings {
  if (!doc) return { ...DEFAULT_STORE_CREDIT_ADMIN }
  const tournament =
    doc.storeCreditTournamentPointsEnabled === true ||
    doc.tournamentPointsEnabled === true
  const tournamentPointsCustomName = normalizeTournamentPointsCustomName(
    doc.tournamentPointsDisplayName
  )
  return {
    csvEnabled: doc.storeCreditCsvEnabled !== false,
    tournamentPointsEnabled: tournament,
    tournamentPointsCustomName,
    tournamentPointsLabel: resolveTournamentPointsDisplayName(
      tournamentPointsCustomName
    )
  }
}

export function isStoreCreditAdminMenuEnabled(
  settings: StoreCreditAdminSettings
): boolean {
  return settings.csvEnabled || settings.tournamentPointsEnabled
}

export function validateStoreCreditAdmin(
  settings: StoreCreditAdminSettings
): string | null {
  if (!isStoreCreditAdminMenuEnabled(settings)) {
    return 'Activa al menos una opción: CSV tienda o Puntos torneo.'
  }
  return null
}

export function applyStoreCreditAdminToDoc(
  doc: {
    storeCreditCsvEnabled: boolean
    storeCreditTournamentPointsEnabled: boolean
    tournamentPointsEnabled?: boolean
    tournamentPointsDisplayName?: string
    set: (key: string, value: unknown) => void
  },
  settings: Pick<
    StoreCreditAdminSettings,
    'csvEnabled' | 'tournamentPointsEnabled' | 'tournamentPointsCustomName'
  >
): void {
  doc.storeCreditCsvEnabled = settings.csvEnabled
  doc.storeCreditTournamentPointsEnabled = settings.tournamentPointsEnabled
  doc.tournamentPointsEnabled = settings.tournamentPointsEnabled
  const custom = normalizeTournamentPointsCustomName(
    settings.tournamentPointsCustomName
  )
  if (custom) {
    doc.tournamentPointsDisplayName = custom
  } else {
    doc.set('tournamentPointsDisplayName', undefined)
  }
}
