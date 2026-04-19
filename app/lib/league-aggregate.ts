import { popidForStorage } from '@/lib/rut-chile'
import { normalizeStoredDashboardRoundCap } from '@/lib/dashboard-round-cap'
import {
  LEAGUE_SCORE_LOSS,
  LEAGUE_SCORE_TIE,
  LEAGUE_SCORE_WIN
} from '@/lib/league-constants'

function nonNegativeInt(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(x) || x < 0) return 0
  return Math.floor(x)
}

/** Puntos de liga en un torneo: 3·W + 1·T + 0·L (independiente del puesto final). */
export function pointsFromWLRecord(
  wins: number,
  losses: number,
  ties: number
): number {
  return (
    wins * LEAGUE_SCORE_WIN +
    losses * LEAGUE_SCORE_LOSS +
    ties * LEAGUE_SCORE_TIE
  )
}

export type LeagueStandingEventDetail = {
  eventId: string
  title: string
  startsAt: string
  wins: number
  losses: number
  ties: number
  points: number
  /** Si hay tope de ronda y snapshot, ronda hasta la que cuenta el récord (emparejamiento guardado). */
  leagueRoundBasis?: number
}

export type LeagueStandingRow = {
  popId: string
  displayName: string
  totalPoints: number
  eventsPlayed: number
  events: LeagueStandingEventDetail[]
}

type LeanParticipant = {
  displayName: string
  popId?: string
  wins?: number
  losses?: number
  ties?: number
}

type LeanRoundSnapshot = {
  roundNum: number
  pairings: {
    player1PopId?: string
    player2PopId?: string
    player1Name?: string
    player2Name?: string
    player1Record?: { wins?: number; losses?: number; ties?: number }
    player2Record?: { wins?: number; losses?: number; ties?: number }
    isBye?: boolean
  }[]
}

export type LeanEventForLeague = {
  _id: unknown
  title: string
  startsAt: Date
  dashboardRoundCap?: number
  roundSnapshots?: LeanRoundSnapshot[]
  participants: LeanParticipant[]
}

/**
 * Entre los snapshots con roundNum ≤ cap, usa el de **mayor** roundNum
 * (récord acumulado al cerrar esa ronda, sin contar rondas posteriores).
 */
export function pickRoundSnapshotAtOrUnderCap(
  snapshots: LeanRoundSnapshot[] | undefined,
  cap: number
): LeanRoundSnapshot | null {
  if (!snapshots?.length) return null
  let best: LeanRoundSnapshot | null = null
  let bestNum = -1
  for (const s of snapshots) {
    const r = Math.round(Number(s.roundNum))
    if (!Number.isFinite(r) || r < 1 || r > cap) continue
    if (r > bestNum) {
      bestNum = r
      best = s
    }
  }
  return best
}

function participantNameByPop(ev: LeanEventForLeague): Map<string, string> {
  const m = new Map<string, string>()
  for (const p of ev.participants ?? []) {
    const k = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (!k) continue
    const n = p.displayName || '—'
    if (!m.has(k) || m.get(k) === '—') m.set(k, n)
  }
  return m
}

function wlMapFromRoundSnapshot(
  snapshot: LeanRoundSnapshot,
  nameByPop: Map<string, string>
): Map<string, { displayName: string; w: number; l: number; t: number }> {
  const out = new Map<
    string,
    { displayName: string; w: number; l: number; t: number }
  >()

  for (const row of snapshot.pairings ?? []) {
    const p1 = popidForStorage(
      typeof row.player1PopId === 'string' ? row.player1PopId : ''
    )
    if (p1) {
      const rawName =
        typeof row.player1Name === 'string' ? row.player1Name.trim() : ''
      const name = rawName || nameByPop.get(p1) || '—'
      out.set(p1, {
        displayName: name,
        w: nonNegativeInt(row.player1Record?.wins),
        l: nonNegativeInt(row.player1Record?.losses),
        t: nonNegativeInt(row.player1Record?.ties)
      })
    }

    if (!row.isBye) {
      const p2 = popidForStorage(
        typeof row.player2PopId === 'string' ? row.player2PopId : ''
      )
      if (p2) {
        const rawName =
          typeof row.player2Name === 'string' ? row.player2Name.trim() : ''
        const name = rawName || nameByPop.get(p2) || '—'
        out.set(p2, {
          displayName: name,
          w: nonNegativeInt(row.player2Record?.wins),
          l: nonNegativeInt(row.player2Record?.losses),
          t: nonNegativeInt(row.player2Record?.ties)
        })
      }
    }
  }

  return out
}

/**
 * Agrupa por POP dentro de un evento por si hubiera filas duplicadas (totales en participantes).
 */
function mergeParticipantsByPop(
  ev: LeanEventForLeague
): Map<string, { displayName: string; w: number; l: number; t: number }> {
  const byPop = new Map<
    string,
    { displayName: string; w: number; l: number; t: number }
  >()

  for (const p of ev.participants ?? []) {
    const k = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (!k) continue
    const w = nonNegativeInt(p.wins)
    const l = nonNegativeInt(p.losses)
    const t = nonNegativeInt(p.ties)
    const name = p.displayName || '—'
    const cur = byPop.get(k)
    if (!cur) {
      byPop.set(k, { displayName: name, w, l, t })
    } else {
      cur.displayName = name || cur.displayName
      cur.w += w
      cur.l += l
      cur.t += t
    }
  }
  return byPop
}

/**
 * Récord W/L/T usado para la liga en un torneo: respeta `dashboardRoundCap`
 * tomando el snapshot de la última ronda ≤ tope; si no hay snapshots guardados,
 * usa los totales del participante (comportamiento previo).
 */
export function leagueMergeSource(ev: LeanEventForLeague): {
  byPop: Map<string, { displayName: string; w: number; l: number; t: number }>
  snapshotRound?: number
} {
  const cap = normalizeStoredDashboardRoundCap(ev.dashboardRoundCap)
  const nameByPop = participantNameByPop(ev)

  if (cap === undefined) {
    return { byPop: mergeParticipantsByPop(ev) }
  }

  const chosen = pickRoundSnapshotAtOrUnderCap(ev.roundSnapshots ?? [], cap)
  if (chosen) {
    return {
      byPop: wlMapFromRoundSnapshot(chosen, nameByPop),
      snapshotRound: Math.round(Number(chosen.roundNum))
    }
  }

  if ((ev.roundSnapshots ?? []).length > 0) {
    return { byPop: new Map() }
  }

  return { byPop: mergeParticipantsByPop(ev) }
}

/** ¿Algún jugador tiene récord no nulo tras aplicar la misma lógica que la liga? */
export function leagueEventHasContributingRecord(
  ev: LeanEventForLeague
): boolean {
  const { byPop } = leagueMergeSource(ev)
  for (const rec of byPop.values()) {
    if (rec.w + rec.l + rec.t > 0) return true
  }
  return false
}

function collectPlayerDetailsFromRecords(events: LeanEventForLeague[]): {
  popToName: Map<string, string>
  playerDetails: Map<string, LeagueStandingEventDetail[]>
} {
  const popToName = new Map<string, string>()
  const playerDetails = new Map<string, LeagueStandingEventDetail[]>()

  for (const ev of events) {
    const eventId = String(ev._id)
    const startsAtIso =
      ev.startsAt instanceof Date
        ? ev.startsAt.toISOString()
        : new Date(ev.startsAt as unknown as string).toISOString()

    const { byPop, snapshotRound } = leagueMergeSource(ev)

    for (const [k, rec] of byPop) {
      if (rec.w + rec.l + rec.t === 0) continue

      if (!popToName.has(k)) popToName.set(k, rec.displayName)
      else if (rec.displayName && rec.displayName !== '—')
        popToName.set(k, rec.displayName)

      const pts = pointsFromWLRecord(rec.w, rec.l, rec.t)
      const detail: LeagueStandingEventDetail = {
        eventId,
        title: ev.title,
        startsAt: startsAtIso,
        wins: rec.w,
        losses: rec.l,
        ties: rec.t,
        points: pts,
        leagueRoundBasis: snapshotRound
      }
      const list = playerDetails.get(k) ?? []
      list.push(detail)
      playerDetails.set(k, list)
    }
  }

  return { popToName, playerDetails }
}

/**
 * `countBestEvents`: si es >= 1, solo suman los N torneos con más puntos por jugador.
 */
function finalizeStandings(
  popToName: Map<string, string>,
  playerDetails: Map<string, LeagueStandingEventDetail[]>,
  countBestEvents: number | null | undefined
): LeagueStandingRow[] {
  const cap =
    countBestEvents != null &&
    typeof countBestEvents === 'number' &&
    Number.isFinite(countBestEvents) &&
    countBestEvents >= 1
      ? Math.floor(countBestEvents)
      : null

  const rows: LeagueStandingRow[] = []

  for (const [popId, details] of playerDetails) {
    const perEventPoints = new Map<string, number>()
    for (const d of details) {
      perEventPoints.set(
        d.eventId,
        (perEventPoints.get(d.eventId) ?? 0) + d.points
      )
    }

    const eventKeys = [...perEventPoints.keys()]
    let keepSet: Set<string>
    let totalPoints: number
    if (cap != null && eventKeys.length > cap) {
      const ranked = [...perEventPoints.entries()].sort((a, b) => b[1] - a[1])
      const top = ranked.slice(0, cap)
      keepSet = new Set(top.map(([id]) => id))
      totalPoints = top.reduce((s, [, pts]) => s + pts, 0)
    } else {
      keepSet = new Set(eventKeys)
      totalPoints = [...perEventPoints.values()].reduce((a, b) => a + b, 0)
    }
    const filteredDetails = details
      .filter(d => keepSet.has(d.eventId))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )

    rows.push({
      popId,
      displayName: popToName.get(popId) ?? '—',
      totalPoints,
      eventsPlayed: keepSet.size,
      events: filteredDetails
    })
  }

  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      a.displayName.localeCompare(b.displayName, 'es')
  )
  return rows
}

/**
 * Suma puntos de liga por récord W/L/T en cada torneo cerrado.
 * Con **tope de ronda** (`dashboardRoundCap`), solo cuenta el récord del snapshot
 * de la última ronda guardada que no supere ese tope (no suma rondas posteriores).
 */
export function aggregateLeagueStandings(
  events: LeanEventForLeague[],
  countBestEvents: number | null | undefined
): LeagueStandingRow[] {
  const { popToName, playerDetails } = collectPlayerDetailsFromRecords(events)
  return finalizeStandings(popToName, playerDetails, countBestEvents)
}
