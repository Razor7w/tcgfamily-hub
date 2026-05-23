/** Prefijo en BD para torneos creados solo por import CSV histórico. */
export const LEGACY_IMPORT_EVENT_TITLE_PREFIX = '[import-puntos] '

const DEFAULT_LEGACY_LABEL = 'Importación histórica'

export function normalizeLegacyTournamentLabel(raw: string): string {
  const t = raw.trim().slice(0, 200)
  return t || DEFAULT_LEGACY_LABEL
}

export function legacyEventStorageTitle(label: string): string {
  return `${LEGACY_IMPORT_EVENT_TITLE_PREFIX}${normalizeLegacyTournamentLabel(label)}`.slice(
    0,
    300
  )
}

export function displayTitleFromLegacyEvent(title: string): string {
  if (title.startsWith(LEGACY_IMPORT_EVENT_TITLE_PREFIX)) {
    return title.slice(LEGACY_IMPORT_EVENT_TITLE_PREFIX.length).trim() || title
  }
  return title
}

export function legacyImportGroupKey(label: string, startsAt?: Date): string {
  const base = normalizeLegacyTournamentLabel(label)
  if (!startsAt || Number.isNaN(startsAt.getTime())) return base
  return `${base}|${startsAt.toISOString().slice(0, 10)}`
}
