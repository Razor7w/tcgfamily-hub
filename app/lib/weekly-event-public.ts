import { popidForStorage } from '@/lib/rut-chile'
import { isUnifiedStandingsPayload } from '@/lib/inferred-tdf-standings'
import type { TournamentStandingsCategoryPayload } from '@/lib/tournament-xml'
import {
  buildParsedMatchesFromRoundSnapshots,
  type RoundSnapshotLean,
  type WltRecord
} from '@/lib/match-rounds-with-snapshots'
import { buildMatchRecordsFromMatches } from '@/lib/tournament-xml'
import { buildPlayerTiebreakersFromMatches } from '@/lib/tournament-tiebreakers'

/** Filas por categoría en listados compactos (tarjeta «Eventos de la semana»). */
export const PUBLIC_STANDINGS_TOP_N = 4

/** Máximo de filas por categoría al pedir clasificación completa (evita payloads absurdos). */
export const PUBLIC_STANDINGS_FULL_MAX = 512

export type BuildTournamentStandingsOptions = {
  maxRowsPerCategory?: number
}

export type PublicStandingsRow = {
  place: number
  displayName: string
  popId?: string
  /** 0–1; solo clasificación completa con snapshots. */
  owp?: number | null
  oowp?: number | null
}

export type TournamentStandingLean = {
  categoryIndex?: number
  finished?: { popId: string; place: number }[]
  dnf?: { popId: string }[]
}

export function categoryLabelEs(categoryIndex: number): string {
  if (categoryIndex === 0) return 'Júnior'
  if (categoryIndex === 1) return 'Sénior'
  return 'Máster'
}

function toStandingsPayload(
  standings: TournamentStandingLean[] | undefined
): TournamentStandingsCategoryPayload[] {
  return (standings ?? [])
    .map(cat => ({
      categoryIndex:
        typeof cat.categoryIndex === 'number'
          ? Math.round(cat.categoryIndex)
          : -1,
      finished: cat.finished ?? [],
      dnf: cat.dnf ?? []
    }))
    .filter(
      c =>
        c.categoryIndex === 0 || c.categoryIndex === 1 || c.categoryIndex === 2
    )
}

/**
 * Resuelve la posición del usuario en standings comparando POP normalizado.
 * Usa el POP de la sesión y, si hace falta, el POP guardado en la inscripción al evento
 * (coincide con el TDF aunque el perfil no tenga POP o esté desactualizado).
 */
export function buildTournamentStandingsPublic(
  standings: TournamentStandingLean[] | undefined,
  participants: { displayName: string; popId?: string }[],
  userPopIdFromSession: string | undefined,
  userPopIdFromParticipant?: string | undefined,
  options?: BuildTournamentStandingsOptions
): {
  standingsTopByCategory: {
    categoryIndex: number
    rows: PublicStandingsRow[]
  }[]
  myTournamentPlacement: {
    categoryIndex: number
    categoryLabel: string
    place: number | null
    isDnf: boolean
  } | null
  standingsUnified: boolean
} {
  const maxRows =
    typeof options?.maxRowsPerCategory === 'number' &&
    Number.isFinite(options.maxRowsPerCategory) &&
    options.maxRowsPerCategory >= 1
      ? Math.min(
          PUBLIC_STANDINGS_FULL_MAX,
          Math.max(1, Math.floor(options.maxRowsPerCategory))
        )
      : PUBLIC_STANDINGS_TOP_N

  const popToName = new Map<string, string>()
  for (const p of participants) {
    const k = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (k) popToName.set(k, p.displayName || '—')
  }

  const myPopNorms = new Set<string>()
  for (const raw of [userPopIdFromSession, userPopIdFromParticipant]) {
    if (typeof raw !== 'string' || !raw.trim()) continue
    const n = popidForStorage(raw)
    if (n) myPopNorms.add(n)
  }

  const standingsUnified = isUnifiedStandingsPayload(
    toStandingsPayload(standings)
  )

  const standingsTopByCategory: {
    categoryIndex: number
    rows: PublicStandingsRow[]
  }[] = []
  let myTournamentPlacement: {
    categoryIndex: number
    categoryLabel: string
    place: number | null
    isDnf: boolean
  } | null = null

  for (const cat of standings ?? []) {
    const ci =
      typeof cat.categoryIndex === 'number' ? Math.round(cat.categoryIndex) : -1
    if (ci !== 0 && ci !== 1 && ci !== 2) continue

    const sorted = [...(cat.finished ?? [])].sort((a, b) => a.place - b.place)
    const rowsPublic: PublicStandingsRow[] = sorted
      .slice(0, maxRows)
      .map(row => {
        const pop = popidForStorage(row.popId)
        return {
          place: Math.max(0, Math.round(Number(row.place) || 0)),
          displayName: popToName.get(pop)?.trim() || '—',
          popId: pop || undefined
        }
      })
    if (rowsPublic.length > 0) {
      standingsTopByCategory.push({ categoryIndex: ci, rows: rowsPublic })
    }

    if (myPopNorms.size > 0 && !myTournamentPlacement) {
      const fin = sorted.find(r => myPopNorms.has(popidForStorage(r.popId)))
      if (fin) {
        myTournamentPlacement = {
          categoryIndex: ci,
          categoryLabel: categoryLabelEs(ci),
          place: Math.max(0, Math.round(Number(fin.place) || 0)),
          isDnf: false
        }
      } else if (
        (cat.dnf ?? []).some(d => myPopNorms.has(popidForStorage(d.popId)))
      ) {
        myTournamentPlacement = {
          categoryIndex: ci,
          categoryLabel: categoryLabelEs(ci),
          place: null,
          isDnf: true
        }
      }
    }
  }

  return { standingsTopByCategory, myTournamentPlacement, standingsUnified }
}

function clampWltPublic(n: unknown): number {
  return Math.max(0, Math.min(999, Math.round(Number(n) || 0)))
}

/**
 * Añade OWP/OOWP a la clasificación completa usando rondas publicadas (TOM).
 */
export function attachTiebreakersToFullPublicStandings(
  categories: {
    categoryIndex: number
    rows: PublicStandingsRow[]
  }[],
  snapshots: RoundSnapshotLean[] | undefined,
  participants: {
    popId?: string
    wins?: unknown
    losses?: unknown
    ties?: unknown
  }[]
): typeof categories {
  if (!snapshots?.length || categories.length === 0) return categories

  const finalRecordsByPop = new Map<string, WltRecord>()
  for (const p of participants) {
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (!pop) continue
    finalRecordsByPop.set(pop, {
      wins: clampWltPublic(p.wins),
      losses: clampWltPublic(p.losses),
      ties: clampWltPublic(p.ties)
    })
  }

  const matches = buildParsedMatchesFromRoundSnapshots(
    snapshots,
    finalRecordsByPop
  )
  if (matches.length === 0) return categories

  const fullRecords = buildMatchRecordsFromMatches(matches)
  const fieldSize = Math.max(
    participants.length,
    finalRecordsByPop.size,
    fullRecords.size,
    2
  )
  const tiebreakers = buildPlayerTiebreakersFromMatches(
    matches,
    fullRecords,
    undefined,
    fieldSize,
    undefined,
    { sameCategoryOnly: false }
  )

  return categories.map(cat => ({
    ...cat,
    rows: cat.rows.map(row => {
      const pop = row.popId ? popidForStorage(row.popId) : ''
      if (!pop) return row
      const tb = tiebreakers.get(pop)
      if (!tb) return row
      return {
        ...row,
        owp: tb.owp,
        oowp: tb.oowp
      }
    })
  }))
}
