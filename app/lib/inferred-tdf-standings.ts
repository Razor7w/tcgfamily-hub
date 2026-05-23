import type { MatchRecord } from '@/lib/tournament-xml'
import type { ParsedPlayer } from '@/lib/tournament-xml'
import type { TournamentStandingsCategoryPayload } from '@/lib/tournament-xml'

/** Fila editable de clasificación (finished). */
export type InferredStandingRow = {
  popId: string
  place: number
}

/** Puntos de partida estándar Play! (3 / 1 / 0). */
export function matchPoints(r: MatchRecord): number {
  return r.wins * 3 + r.ties
}

/**
 * Orden sugerido cuando el TDF no trae &lt;standings&gt;: más puntos, más victorias,
 * menos derrotas, más empates, POP estable.
 */
export function compareMatchRecordsForStandings(
  a: MatchRecord,
  b: MatchRecord
): number {
  const pa = matchPoints(a)
  const pb = matchPoints(b)
  if (pb !== pa) return pb - pa
  if (b.wins !== a.wins) return b.wins - a.wins
  if (a.losses !== b.losses) return a.losses - b.losses
  if (b.ties !== a.ties) return b.ties - a.ties
  return 0
}

/** Extrae año de nacimiento desde fechas habituales en TDF (yyyy-mm-dd, etc.). */
export function parseBirthYearFromTdf(birthdate: string): number | null {
  const s = birthdate.trim()
  if (!s) return null
  const iso = /^(\d{4})-\d{1,2}-\d{1,2}/.exec(s)
  if (iso) {
    const y = Number(iso[1])
    return Number.isFinite(y) && y > 1900 && y < 2100 ? y : null
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (slash) {
    const y = Number(slash[3])
    return Number.isFinite(y) && y > 1900 && y < 2100 ? y : null
  }
  const yOnly = /^(\d{4})$/.exec(s)
  if (yOnly) {
    const y = Number(yOnly[1])
    return Number.isFinite(y) && y > 1900 && y < 2100 ? y : null
  }
  return null
}

/**
 * Categoría Play! por año de nacimiento (temporada 2025–26).
 * Sin fecha → Sénior (1).
 */
export function inferPlayCategoryIndexFromBirthYear(
  birthYear: number | null
): 0 | 1 | 2 {
  if (birthYear === null) return 1
  if (birthYear >= 2015) return 0
  if (birthYear >= 2011) return 1
  return 2
}

export function inferPlayCategoryIndexForPlayer(
  player: ParsedPlayer
): 0 | 1 | 2 {
  return inferPlayCategoryIndexFromBirthYear(
    parseBirthYearFromTdf(player.birthdate)
  )
}

function assignPlaces(popIds: string[]): InferredStandingRow[] {
  return popIds.map((popId, i) => ({ popId, place: i + 1 }))
}

/**
 * Clasificación propuesta por categoría a partir de récords W/L/T del TDF.
 */
export function buildInferredStandingsByCategory(
  players: ParsedPlayer[],
  matchRecords: Map<string, MatchRecord>
): TournamentStandingsCategoryPayload[] {
  const buckets: ParsedPlayer[][] = [[], [], []]
  for (const p of players) {
    const pop = p.popId.trim()
    if (!pop) continue
    const ci = inferPlayCategoryIndexForPlayer(p)
    buckets[ci].push(p)
  }

  const out: TournamentStandingsCategoryPayload[] = []
  for (let ci = 0; ci < 3; ci++) {
    const list = [...buckets[ci]]
    list.sort((a, b) => {
      const ra = matchRecords.get(a.popId) ?? { wins: 0, losses: 0, ties: 0 }
      const rb = matchRecords.get(b.popId) ?? { wins: 0, losses: 0, ties: 0 }
      const cmp = compareMatchRecordsForStandings(ra, rb)
      if (cmp !== 0) return cmp
      return a.popId.localeCompare(b.popId)
    })
    out.push({
      categoryIndex: ci,
      finished: assignPlaces(list.map(p => p.popId.trim())),
      dnf: []
    })
  }
  return out
}

export function reorderStandingRows(
  rows: InferredStandingRow[],
  index: number,
  direction: -1 | 1
): InferredStandingRow[] {
  const j = index + direction
  if (j < 0 || j >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[j]] = [next[j], next[index]]
  return next.map((r, i) => ({ popId: r.popId, place: i + 1 }))
}

export function categoryLabelFromIndex(categoryIndex: number): string {
  if (categoryIndex === 0) return 'Júnior'
  if (categoryIndex === 1) return 'Sénior'
  if (categoryIndex === 2) return 'Máster'
  return `Categoría ${categoryIndex}`
}
