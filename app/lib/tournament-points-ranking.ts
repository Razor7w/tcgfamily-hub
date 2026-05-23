import { compareMatchRecordsForStandings } from '@/lib/inferred-tdf-standings'
import { popidForStorage } from '@/lib/rut-chile'
import type { ITournamentCategoryStandings } from '@/models/WeeklyEvent'

export type TournamentPointsRankedPlayer = {
  displayName: string
  popId: string
  userId: string | null
  wins: number
  losses: number
  ties: number
  /** Puesto en standings importados (si existe). */
  standingPlace: number | null
}

type LeanParticipant = {
  displayName?: string
  popId?: string
  userId?: unknown
  wins?: unknown
  losses?: unknown
  ties?: unknown
}

function readUserId(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    return String((raw as { _id: unknown })._id)
  }
  return String(raw)
}

function clampWlt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(999, Math.round(n)))
}

function bestStandingPlaceByPop(
  standings: ITournamentCategoryStandings[] | undefined
): Map<string, number> {
  const map = new Map<string, number>()
  for (const cat of standings ?? []) {
    for (const row of cat.finished ?? []) {
      const pop = popidForStorage(row.popId)
      if (!pop) continue
      const place = Math.round(Number(row.place) || 0)
      if (place <= 0) continue
      const prev = map.get(pop)
      if (prev === undefined || place < prev) map.set(pop, place)
    }
  }
  return map
}

/**
 * Orden de jugadores para «Puntos por torneo»: standings importados primero,
 * luego récord W/L/T del listado del evento.
 */
export function rankPlayersForTournamentPoints(input: {
  participants: LeanParticipant[]
  tournamentStandings?: ITournamentCategoryStandings[]
}): TournamentPointsRankedPlayer[] {
  const standingByPop = bestStandingPlaceByPop(input.tournamentStandings)
  const rows: TournamentPointsRankedPlayer[] = []

  for (const p of input.participants) {
    const popRaw = typeof p.popId === 'string' ? p.popId.trim() : ''
    const pop = popidForStorage(popRaw) || popRaw
    if (!pop) continue
    const displayName =
      typeof p.displayName === 'string' && p.displayName.trim()
        ? p.displayName.trim()
        : `Jugador ${pop}`
    rows.push({
      displayName,
      popId: pop,
      userId: readUserId(p.userId),
      wins: clampWlt(p.wins),
      losses: clampWlt(p.losses),
      ties: clampWlt(p.ties),
      standingPlace: standingByPop.get(pop) ?? null
    })
  }

  rows.sort((a, b) => {
    const ap = a.standingPlace
    const bp = b.standingPlace
    if (ap !== null && bp !== null && ap !== bp) return ap - bp
    if (ap !== null && bp === null) return -1
    if (ap === null && bp !== null) return 1
    const cmp = compareMatchRecordsForStandings(
      { wins: a.wins, losses: a.losses, ties: a.ties },
      { wins: b.wins, losses: b.losses, ties: b.ties }
    )
    if (cmp !== 0) return cmp
    return a.displayName.localeCompare(b.displayName)
  })

  return rows
}
