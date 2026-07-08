import {
  buildMatchRecordsExcludingByes,
  buildPlayerTiebreakersFromMatches,
  comparePopIdsForStandings,
  filterMatchesForTiebreakers,
  swissRoundCountForTiebreakers
} from '@/lib/tournament-tiebreakers'
import type { MatchRecord, ParsedMatch } from '@/lib/tournament-xml'
import type { ParsedPlayer } from '@/lib/tournament-xml'
import {
  droppedPopIdsFromPlayers,
  type TournamentStandingsCategoryPayload
} from '@/lib/tournament-xml'

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
 * Retirados: `<dropped>` en TDF o menos rondas jugadas que el suizo del torneo.
 */
function droppedPopIdsForStandingsSort(
  popIds: string[],
  players: ParsedPlayer[],
  matchRecords: Map<string, MatchRecord>,
  matches: ParsedMatch[],
  fromTdf?: ReadonlySet<string>
): ReadonlySet<string> {
  const out = new Set(fromTdf ?? droppedPopIdsFromPlayers(players))
  const fieldSize = Math.max(players.length, popIds.length, 2)
  const swiss = filterMatchesForTiebreakers(matches, fieldSize)
  const swissRec = buildMatchRecordsExcludingByes(swiss)
  const totalRounds = swissRoundCountForTiebreakers(
    matches,
    fieldSize,
    swissRec
  )
  if (totalRounds <= 0) return out

  for (const pop of popIds) {
    const r = matchRecords.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
    const played = r.wins + r.losses + r.ties
    if (played > 0 && played < totalRounds) out.add(pop)
  }
  return out
}

function sortPopIdsForStandings(
  popIds: string[],
  players: ParsedPlayer[],
  matchRecords: Map<string, MatchRecord>,
  matches: ParsedMatch[],
  droppedPopIds?: ReadonlySet<string>,
  sameCategoryOnly = true
): string[] {
  const dropped = droppedPopIdsForStandingsSort(
    popIds,
    players,
    matchRecords,
    matches,
    droppedPopIds
  )
  const tiebreakers = buildPlayerTiebreakersFromMatches(
    matches,
    matchRecords,
    dropped,
    players.length,
    players,
    { sameCategoryOnly }
  )
  return [...popIds].sort((a, b) =>
    comparePopIdsForStandings(a, b, matchRecords, tiebreakers, dropped)
  )
}

/**
 * Clasificación propuesta por categoría a partir de récords y partidas del TDF
 * (puntos → W/L/T → OWP → OOWP).
 */
export function buildInferredStandingsByCategory(
  players: ParsedPlayer[],
  matchRecords: Map<string, MatchRecord>,
  matches: ParsedMatch[] = []
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
    const pops = buckets[ci].map(p => p.popId.trim()).filter(Boolean)
    const sorted = sortPopIdsForStandings(
      pops,
      buckets[ci],
      matchRecords,
      matches,
      droppedPopIdsFromPlayers(buckets[ci]),
      true
    )
    out.push({
      categoryIndex: ci,
      finished: assignPlaces(sorted),
      dnf: []
    })
  }
  return out
}

/** Categoría destino al unificar (Máster). */
export const UNIFIED_STANDINGS_CATEGORY_INDEX = 2 as const

/** Júnior y Sénior (vacíos cuando la clasificación está unificada en Máster). */
export const NON_UNIFIED_STANDING_CATEGORY_INDICES = [0, 1] as const

/** @deprecated Usar NON_UNIFIED_STANDING_CATEGORY_INDICES */
export const NON_SENIOR_STANDING_CATEGORY_INDICES =
  NON_UNIFIED_STANDING_CATEGORY_INDICES

/**
 * Host de tabla unificada: Máster (2), o Sénior (1) en eventos legacy.
 * null si no está unificada.
 */
export function unifiedStandingsHostCategoryIndex(
  standings: TournamentStandingsCategoryPayload[]
): 1 | 2 | null {
  for (const host of [2, 1] as const) {
    const hostCat = standings.find(c => c.categoryIndex === host)
    const otherFinished = standings
      .filter(c => c.categoryIndex !== host)
      .reduce((n, c) => n + c.finished.length, 0)
    if (hostCat && hostCat.finished.length > 0 && otherFinished === 0) {
      return host
    }
  }
  return null
}

/**
 * Clasificación unificada: todos los puestos en Máster (2) — o Sénior (1) legacy —
 * sin finished en las otras categorías de edad.
 */
export function isUnifiedStandingsPayload(
  standings: TournamentStandingsCategoryPayload[]
): boolean {
  return unifiedStandingsHostCategoryIndex(standings) != null
}

/**
 * Una sola tabla de clasificación (categoría Máster / índice 2) con todos los jugadores.
 */
export function buildUnifiedInferredStandings(
  players: ParsedPlayer[],
  matchRecords: Map<string, MatchRecord>,
  matches: ParsedMatch[]
): TournamentStandingsCategoryPayload[] {
  const pops = players.map(p => p.popId.trim()).filter(Boolean)
  const sorted = sortPopIdsForStandings(
    pops,
    players,
    matchRecords,
    matches,
    droppedPopIdsFromPlayers(players),
    false
  )
  return [
    { categoryIndex: 0, finished: [], dnf: [] },
    { categoryIndex: 1, finished: [], dnf: [] },
    { categoryIndex: 2, finished: assignPlaces(sorted), dnf: [] }
  ]
}

/**
 * Reordena y fusiona las categorías actuales en una sola (Máster / índice 2), conservando DNF.
 */
export function unifyStandingsCategories(
  standings: TournamentStandingsCategoryPayload[],
  matchRecords: Map<string, MatchRecord>,
  matches: ParsedMatch[],
  players: ParsedPlayer[] = []
): TournamentStandingsCategoryPayload[] {
  const finishedPops: string[] = []
  const dnfPops = new Set<string>()
  for (const cat of standings) {
    for (const row of cat.finished) {
      const pop = row.popId.trim()
      if (pop) finishedPops.push(pop)
    }
    for (const row of cat.dnf ?? []) {
      const pop = row.popId.trim()
      if (pop) dnfPops.add(pop)
    }
  }
  const sorted = sortPopIdsForStandings(
    finishedPops,
    players,
    matchRecords,
    matches,
    droppedPopIdsFromPlayers(players),
    false
  )
  return [
    { categoryIndex: 0, finished: [], dnf: [] },
    { categoryIndex: 1, finished: [], dnf: [] },
    {
      categoryIndex: UNIFIED_STANDINGS_CATEGORY_INDEX,
      finished: assignPlaces(sorted),
      dnf: [...dnfPops].map(popId => ({ popId }))
    }
  ]
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
