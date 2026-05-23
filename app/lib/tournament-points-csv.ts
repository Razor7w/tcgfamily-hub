import {
  parseCsvSemicolonLine,
  parseExpiryDate,
  unwrapExcelText
} from '@/lib/store-points-csv'
import { popidForStorage } from '@/lib/rut-chile'
import { normalizeLegacyTournamentLabel } from '@/lib/tournament-points-legacy-label'

export type TournamentPointsCsvRow = {
  /** Presente si el CSV trae `evento_id` (torneo ya en la app). */
  eventId?: string
  /** Agrupa filas sin `evento_id` (nombre del torneo histórico). */
  tournamentKey: string
  eventDate?: Date
  popId: string
  displayName: string
  place: number
  points: number
  lineNum: number
}

export type TournamentPointsCsvHeaderMap = {
  usesEventId: boolean
  idxEventId: number
  idxTorneo: number
  idxFecha: number
  idxPop: number
  idxNombre: number
  idxPuesto: number
  idxPuntos: number
}

function headerIndex(lower: string[], ...needles: string[]): number {
  for (const n of needles) {
    const i = lower.findIndex(h => h === n || h.includes(n))
    if (i >= 0) return i
  }
  return -1
}

export function mapTournamentPointsCsvHeader(
  cells: string[]
): TournamentPointsCsvHeaderMap | null {
  const lower = cells.map(c => unwrapExcelText(c).toLowerCase())
  const idxEventId = headerIndex(
    lower,
    'evento_id',
    'event_id',
    'id_evento',
    'id evento'
  )
  const idxTorneo = headerIndex(
    lower,
    'torneo',
    'evento',
    'nombre_torneo',
    'tournament',
    'titulo'
  )
  const idxFecha = headerIndex(lower, 'fecha', 'date', 'fecha_torneo')
  const idxPop = headerIndex(lower, 'pop', 'pop_id', 'popid', 'rut', 'pop id')
  const idxNombre = headerIndex(
    lower,
    'nombre',
    'jugador',
    'display_name',
    'nombre jugador'
  )
  const idxPuesto = headerIndex(lower, 'puesto', 'place', 'ranking', 'posicion')
  const idxPuntos = headerIndex(lower, 'puntos', 'points', 'pts')

  const usesEventId = idxEventId >= 0
  if (idxPop < 0 || idxPuesto < 0 || idxPuntos < 0) {
    return null
  }

  return {
    usesEventId,
    idxEventId,
    idxTorneo,
    idxFecha,
    idxPop,
    idxNombre,
    idxPuesto,
    idxPuntos
  }
}

export function rowToTournamentPointsCsv(
  cells: string[],
  map: TournamentPointsCsvHeaderMap,
  lineNum: number
): TournamentPointsCsvRow | null {
  const popId = popidForStorage(cells[map.idxPop] ?? '')
  if (!popId) return null

  const place = Math.max(
    1,
    Math.min(
      9999,
      Math.round(
        Number.parseInt(unwrapExcelText(cells[map.idxPuesto] ?? ''), 10) || 0
      )
    )
  )
  const points = Math.max(
    0,
    Math.min(
      999_999,
      Math.round(
        Number.parseInt(unwrapExcelText(cells[map.idxPuntos] ?? ''), 10) || 0
      )
    )
  )
  if (place < 1 || points < 0) return null

  const nombreRaw =
    map.idxNombre >= 0 ? unwrapExcelText(cells[map.idxNombre] ?? '') : ''
  const displayName = nombreRaw.trim().slice(0, 200) || popId

  const eventDate =
    map.idxFecha >= 0 ? parseExpiryDate(cells[map.idxFecha] ?? '') : undefined

  if (map.usesEventId) {
    const eventId = unwrapExcelText(cells[map.idxEventId] ?? '').trim()
    if (!eventId) return null
    return {
      eventId,
      tournamentKey: eventId,
      eventDate,
      popId,
      displayName,
      place,
      points,
      lineNum
    }
  }

  const torneoRaw =
    map.idxTorneo >= 0 ? unwrapExcelText(cells[map.idxTorneo] ?? '') : ''
  const tournamentKey = normalizeLegacyTournamentLabel(torneoRaw)

  return {
    tournamentKey,
    eventDate,
    popId,
    displayName,
    place,
    points,
    lineNum
  }
}

export function parseTournamentPointsCsv(text: string): {
  rows: TournamentPointsCsvRow[]
  errors: string[]
  usesEventId: boolean
} {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(l => l.trim())
  const errors: string[] = []
  if (lines.length < 2) {
    return {
      rows: [],
      errors: ['El CSV debe tener encabezado y al menos una fila'],
      usesEventId: false
    }
  }

  const headerMap = mapTournamentPointsCsvHeader(
    parseCsvSemicolonLine(lines[0]!)
  )
  if (!headerMap) {
    return {
      rows: [],
      errors: [
        'Encabezados mínimos: pop;puesto;puntos (+ nombre, torneo, fecha opcionales). ' +
          'O con evento en la app: evento_id;pop;nombre;puesto;puntos.'
      ],
      usesEventId: false
    }
  }

  const rows: TournamentPointsCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvSemicolonLine(lines[i]!)
    const row = rowToTournamentPointsCsv(cells, headerMap, i + 1)
    if (!row) {
      errors.push(`Fila ${i + 1}: datos incompletos o inválidos`)
      continue
    }
    rows.push(row)
  }
  return { rows, errors, usesEventId: headerMap.usesEventId }
}

export const TOURNAMENT_POINTS_CSV_TEMPLATE_LEGACY = `torneo;fecha;pop;nombre;puesto;puntos
Torneo Estándar;15/03/2024;12345678-9;Nombre Apellido;1;5
Torneo Estándar;15/03/2024;98765432-1;Otro Jugador;2;3`

export const TOURNAMENT_POINTS_CSV_TEMPLATE_MINIMAL = `pop;nombre;puesto;puntos
12345678-9;Sebastian Carroza;1;5
98765432-1;Otro Jugador;2;3`

export const TOURNAMENT_POINTS_CSV_TEMPLATE_WITH_ID = `evento_id;pop;nombre;puesto;puntos
REEMPLAZA_ID_EVENTO;12345678-9;Nombre Apellido;1;5`

/** Plantilla por defecto: histórico sin ID de evento. */
export const TOURNAMENT_POINTS_CSV_TEMPLATE =
  TOURNAMENT_POINTS_CSV_TEMPLATE_LEGACY

export function groupKeyForCsvRow(row: TournamentPointsCsvRow): string {
  if (row.eventId) return `id:${row.eventId}`
  const datePart =
    row.eventDate && !Number.isNaN(row.eventDate.getTime())
      ? `|${row.eventDate.toISOString().slice(0, 10)}`
      : ''
  return `legacy:${row.tournamentKey}${datePart}`
}

/**
 * Varias filas con el mismo POP en un torneo (ej. dos podios históricos)
 * se fusionan: puntos se suman, puesto = el mejor (menor número).
 */
export function mergeImportCsvRowsByPopId(rows: TournamentPointsCsvRow[]): {
  merged: TournamentPointsCsvRow[]
  combinedPopRows: number
} {
  const byPop = new Map<string, TournamentPointsCsvRow>()
  let combinedPopRows = 0

  for (const row of rows) {
    const existing = byPop.get(row.popId)
    if (!existing) {
      byPop.set(row.popId, { ...row })
      continue
    }
    combinedPopRows++
    byPop.set(row.popId, {
      ...existing,
      displayName: existing.displayName || row.displayName,
      place: Math.min(existing.place, row.place),
      points: Math.min(999_999, (existing.points ?? 0) + (row.points ?? 0))
    })
  }

  const merged = [...byPop.values()].sort((a, b) => a.place - b.place)
  return { merged, combinedPopRows }
}
