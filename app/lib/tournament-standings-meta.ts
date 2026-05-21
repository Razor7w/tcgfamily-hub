import { pointsFromWLRecord } from '@/lib/league-aggregate'
import { popidForStorage } from '@/lib/rut-chile'
import {
  categoryLabelEs,
  type TournamentStandingLean
} from '@/lib/weekly-event-public'
import type { TournamentMetaParticipantDTO } from '@/lib/tournament-meta-build'
import { formatPersonDisplayName } from '@/lib/weekly-events'

export type TournamentStandingsRowDTO = {
  place: number | null
  isDnf: boolean
  displayName: string
  popId: string | null
  participantKey: string | null
  userId: string | null
  points: number | null
  record: { wins: number; losses: number; ties: number } | null
  deckPokemonSlugs: string[]
  decklistDisplay: { decklistName: string; listLabel: string } | null
  hasDecklist: boolean
  reportedOnPlatform: boolean
  /** Fila extra: jugó y reportó en Nexo pero no figura en la clasificación importada. */
  reportOnly?: boolean
}

export type TournamentStandingsCategoryDTO = {
  categoryIndex: number
  categoryLabel: string
  rows: TournamentStandingsRowDTO[]
}

export type TournamentStandingsMetaDTO = {
  categories: TournamentStandingsCategoryDTO[]
  /** Reportaron deck/sprites/rondas y no están en ningún pod de standings. */
  reportedWithoutPlacement: TournamentStandingsRowDTO[]
}

type ParticipantEnrichment = {
  participantKey: string
  userId: string | null
  displayName: string
  popId: string | null
  deckPokemonSlugs: string[]
  decklistDisplay: { decklistName: string; listLabel: string } | null
  hasDecklist: boolean
  matchRecord: { wins: number; losses: number; ties: number } | null
  reportedOnPlatform: boolean
}

function hasReportedOnPlatform(p: {
  deckPokemonSlugs: string[]
  hasDecklist: boolean
  reportedOnPlatform: boolean
}): boolean {
  return p.reportedOnPlatform || p.deckPokemonSlugs.length > 0 || p.hasDecklist
}

function enrichmentFromDto(
  p: TournamentMetaParticipantDTO & { popId?: string | null }
): ParticipantEnrichment {
  return {
    participantKey: p.participantKey,
    userId: p.userId,
    displayName: formatPersonDisplayName(p.displayName),
    popId:
      typeof p.popId === 'string' && p.popId.trim() ? p.popId.trim() : null,
    deckPokemonSlugs: p.deckPokemonSlugs,
    decklistDisplay: p.decklistDisplay,
    hasDecklist: p.hasDecklist,
    matchRecord: p.matchRecord,
    reportedOnPlatform:
      p.deckPokemonSlugs.length > 0 || p.hasDecklist || p.matchRounds.length > 0
  }
}

function buildPopLookup(
  played: (TournamentMetaParticipantDTO & { popId?: string | null })[]
): Map<string, ParticipantEnrichment> {
  const map = new Map<string, ParticipantEnrichment>()
  for (const p of played) {
    const e = enrichmentFromDto(p)
    const norm = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (norm) map.set(norm, e)
  }
  return map
}

function rowFromEnrichment(
  e: ParticipantEnrichment,
  place: number | null,
  isDnf: boolean,
  reportOnly = false
): TournamentStandingsRowDTO {
  const rec = e.matchRecord
  return {
    place,
    isDnf,
    displayName: e.displayName,
    popId: e.popId,
    participantKey: e.participantKey,
    userId: e.userId,
    points: rec ? pointsFromWLRecord(rec.wins, rec.losses, rec.ties) : null,
    record: rec,
    deckPokemonSlugs: e.deckPokemonSlugs,
    decklistDisplay: e.decklistDisplay,
    hasDecklist: e.hasDecklist,
    reportedOnPlatform: e.reportedOnPlatform,
    reportOnly
  }
}

function rowFromStandingPop(
  popId: string,
  place: number | null,
  isDnf: boolean,
  popLookup: Map<string, ParticipantEnrichment>,
  popToName: Map<string, string>
): TournamentStandingsRowDTO {
  const norm = popidForStorage(popId)
  const e = norm ? popLookup.get(norm) : undefined
  if (e) return rowFromEnrichment(e, place, isDnf)
  return {
    place,
    isDnf,
    displayName: (norm && popToName.get(norm)) || '—',
    popId: norm || popId.trim() || null,
    participantKey: null,
    userId: null,
    points: null,
    record: null,
    deckPokemonSlugs: [],
    decklistDisplay: null,
    hasDecklist: false,
    reportedOnPlatform: false
  }
}

type LeanManualPlacement = {
  categoryIndex?: number
  place?: number | null
  isDnf?: boolean
}

type LeanParticipantForStandings = {
  displayName?: string
  popId?: string
  manualPlacement?: LeanManualPlacement
}

function buildCategoriesFromManualPlacements(
  participants: LeanParticipantForStandings[],
  popLookup: Map<string, ParticipantEnrichment>
): TournamentStandingsCategoryDTO[] {
  const buckets = new Map<
    number,
    { finished: { place: number; pop: string }[]; dnf: string[] }
  >()
  for (const c of [0, 1, 2]) {
    buckets.set(c, { finished: [], dnf: [] })
  }

  for (const p of participants) {
    const mp = p.manualPlacement
    if (!mp || typeof mp.categoryIndex !== 'number') continue
    const ci = Math.max(0, Math.min(2, Math.round(mp.categoryIndex)))
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (!pop) continue
    if (mp.isDnf) {
      buckets.get(ci)!.dnf.push(pop)
    } else if (typeof mp.place === 'number' && Number.isFinite(mp.place)) {
      buckets.get(ci)!.finished.push({
        place: Math.max(1, Math.round(mp.place)),
        pop
      })
    }
  }

  const categories: TournamentStandingsCategoryDTO[] = []
  for (const ci of [0, 1, 2]) {
    const bucket = buckets.get(ci)!
    bucket.finished.sort((a, b) => a.place - b.place)
    const rows: TournamentStandingsRowDTO[] = []
    for (const fin of bucket.finished) {
      const e = popLookup.get(fin.pop)
      rows.push(
        e
          ? rowFromEnrichment(e, fin.place, false)
          : rowFromStandingPop(fin.pop, fin.place, false, popLookup, new Map())
      )
    }
    for (const pop of bucket.dnf) {
      const e = popLookup.get(pop)
      rows.push(
        e
          ? rowFromEnrichment(e, null, true)
          : rowFromStandingPop(pop, null, true, popLookup, new Map())
      )
    }
    if (rows.length > 0) {
      categories.push({
        categoryIndex: ci,
        categoryLabel: categoryLabelEs(ci),
        rows
      })
    }
  }
  return categories
}

function buildCategoriesFromTournamentStandings(
  standings: TournamentStandingLean[],
  popLookup: Map<string, ParticipantEnrichment>,
  popToName: Map<string, string>
): TournamentStandingsCategoryDTO[] {
  const categories: TournamentStandingsCategoryDTO[] = []
  for (const cat of standings) {
    const ci =
      typeof cat.categoryIndex === 'number' ? Math.round(cat.categoryIndex) : -1
    if (ci !== 0 && ci !== 1 && ci !== 2) continue

    const rows: TournamentStandingsRowDTO[] = []
    const sorted = [...(cat.finished ?? [])].sort((a, b) => a.place - b.place)
    for (const fin of sorted) {
      rows.push(
        rowFromStandingPop(
          fin.popId,
          Math.max(0, Math.round(Number(fin.place) || 0)),
          false,
          popLookup,
          popToName
        )
      )
    }
    for (const d of cat.dnf ?? []) {
      rows.push(rowFromStandingPop(d.popId, null, true, popLookup, popToName))
    }
    if (rows.length > 0) {
      categories.push({
        categoryIndex: ci,
        categoryLabel: categoryLabelEs(ci),
        rows
      })
    }
  }
  return categories
}

function collectStandingPopIds(
  categories: TournamentStandingsCategoryDTO[]
): Set<string> {
  const set = new Set<string>()
  for (const cat of categories) {
    for (const row of cat.rows) {
      const n = popidForStorage(row.popId ?? '')
      if (n) set.add(n)
    }
  }
  return set
}

export function buildTournamentStandingsMeta(
  tournamentStandings: TournamentStandingLean[] | undefined,
  playedParticipants: (TournamentMetaParticipantDTO & {
    popId?: string | null
  })[],
  leanParticipants: LeanParticipantForStandings[]
): TournamentStandingsMetaDTO {
  const popLookup = buildPopLookup(playedParticipants)
  const popToName = new Map<string, string>()
  for (const p of leanParticipants) {
    const n = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    const name =
      typeof p.displayName === 'string' && p.displayName.trim()
        ? formatPersonDisplayName(p.displayName)
        : ''
    if (n && name) popToName.set(n, name)
  }

  let categories: TournamentStandingsCategoryDTO[] = []
  const hasImported =
    Array.isArray(tournamentStandings) && tournamentStandings.length > 0

  if (hasImported) {
    categories = buildCategoriesFromTournamentStandings(
      tournamentStandings,
      popLookup,
      popToName
    )
  } else {
    categories = buildCategoriesFromManualPlacements(
      leanParticipants,
      popLookup
    )
  }

  const inStandings = collectStandingPopIds(categories)
  const reportedWithoutPlacement: TournamentStandingsRowDTO[] = []

  for (const p of playedParticipants) {
    const e = enrichmentFromDto(p)
    if (!hasReportedOnPlatform(e)) continue
    const norm = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (norm && inStandings.has(norm)) continue
    reportedWithoutPlacement.push(rowFromEnrichment(e, null, false, true))
  }

  reportedWithoutPlacement.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'es')
  )

  return { categories, reportedWithoutPlacement }
}

/** Orden visual de categorías (Máster → Sénior → Júnior), igual que la pestaña Standings. */
export function standingsCategoryTabSortKey(categoryIndex: number): number {
  if (categoryIndex === 2) return 0
  if (categoryIndex === 1) return 1
  if (categoryIndex === 0) return 2
  return 9
}

/**
 * Índice de orden por POP según filas de standings (puesto 1…N, luego DNF por categoría).
 * Quien no aparece en la clasificación queda fuera del mapa (ordenar al final).
 */
export function buildPopStandingSortMap(
  standings: TournamentStandingsMetaDTO
): Map<string, number> {
  const map = new Map<string, number>()
  let order = 0
  const sortedCats = [...standings.categories].sort(
    (a, b) =>
      standingsCategoryTabSortKey(a.categoryIndex) -
      standingsCategoryTabSortKey(b.categoryIndex)
  )
  for (const cat of sortedCats) {
    for (const row of cat.rows) {
      const pop = popidForStorage(row.popId ?? '')
      if (pop && !map.has(pop)) map.set(pop, order++)
    }
  }
  return map
}

const NO_STANDING_SORT = 1_000_000

export function compareParticipantsByStanding(
  a: Pick<TournamentMetaParticipantDTO, 'popId' | 'displayName'>,
  b: Pick<TournamentMetaParticipantDTO, 'popId' | 'displayName'>,
  popSort: Map<string, number>
): number {
  const popA = popidForStorage(a.popId ?? '')
  const popB = popidForStorage(b.popId ?? '')
  const oa = popA && popSort.has(popA) ? popSort.get(popA)! : NO_STANDING_SORT
  const ob = popB && popSort.has(popB) ? popSort.get(popB)! : NO_STANDING_SORT
  if (oa !== ob) return oa - ob
  return a.displayName.localeCompare(b.displayName, 'es')
}

export type ParticipantStandingInfo = {
  place: number | null
  isDnf: boolean
}

export type ParticipantStandingLookup = {
  byPopId: Map<string, ParticipantStandingInfo>
  byParticipantKey: Map<string, ParticipantStandingInfo>
}

function addStandingRowToLookup(
  row: TournamentStandingsRowDTO,
  lookup: ParticipantStandingLookup
): void {
  const info: ParticipantStandingInfo = {
    place: row.place,
    isDnf: row.isDnf
  }
  const pop = popidForStorage(row.popId ?? '')
  if (pop && !lookup.byPopId.has(pop)) lookup.byPopId.set(pop, info)
  const key = row.participantKey?.trim()
  if (key && !lookup.byParticipantKey.has(key)) {
    lookup.byParticipantKey.set(key, info)
  }
}

export function buildParticipantStandingLookup(
  standings: TournamentStandingsMetaDTO
): ParticipantStandingLookup {
  const lookup: ParticipantStandingLookup = {
    byPopId: new Map(),
    byParticipantKey: new Map()
  }
  for (const cat of standings.categories) {
    for (const row of cat.rows) addStandingRowToLookup(row, lookup)
  }
  for (const row of standings.reportedWithoutPlacement) {
    addStandingRowToLookup(row, lookup)
  }
  return lookup
}

export function lookupParticipantStanding(
  p: Pick<TournamentMetaParticipantDTO, 'popId' | 'participantKey'>,
  lookup: ParticipantStandingLookup
): ParticipantStandingInfo | null {
  const pop = popidForStorage(p.popId ?? '')
  if (pop && lookup.byPopId.has(pop)) return lookup.byPopId.get(pop)!
  const key = p.participantKey.trim()
  if (key && lookup.byParticipantKey.has(key))
    return lookup.byParticipantKey.get(key)!
  return null
}

export function formatParticipantStandingLabel(
  info: ParticipantStandingInfo | null
): string {
  if (!info) return '—'
  if (info.isDnf) {
    return info.place != null && info.place > 0 ? String(info.place) : 'DNF'
  }
  if (info.place != null && info.place > 0) return String(info.place)
  return '—'
}
