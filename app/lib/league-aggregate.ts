import { popidForStorage } from '@/lib/rut-chile'
import { normalizeStoredDashboardRoundCap } from '@/lib/dashboard-round-cap'
import {
  matchRecordFromRounds,
  parseParticipantMatchRoundsFromLean
} from '@/lib/participant-match-round'
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
  /** Con tope de ronda (dashboard), el N mostrado en «hasta ronda N» (coincide con el tope fijado). */
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
  matchRounds?: unknown
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
 * Máx. `roundNum` estricto (1-based `1…cap` o 0-based `0…cap-1`), sin ronda
 * “N+1 abierta” — útil como respaldo o callers que excluyen `cap+1`.
 */
export function pickRoundSnapshotAtOrUnderCap(
  snapshots: LeanRoundSnapshot[] | undefined,
  cap: number
): LeanRoundSnapshot | null {
  return pickRoundSnapshotNarrow(snapshots, cap)
}

function pickRoundSnapshotNarrow(
  snapshots: LeanRoundSnapshot[] | undefined,
  cap: number
): LeanRoundSnapshot | null {
  if (!snapshots?.length) return null
  const hasZero = snapshots.some(s => {
    const r = Math.round(Number(s.roundNum))
    return Number.isFinite(r) && r === 0
  })
  let best: LeanRoundSnapshot | null = null
  let bestNum = -999
  for (const s of snapshots) {
    const r = Math.round(Number(s.roundNum))
    if (!Number.isFinite(r)) continue
    if (hasZero) {
      if (r < 0 || r > cap - 1) continue
    } else {
      if (r < 1 || r > cap) continue
    }
    if (r > bestNum) {
      bestNum = r
      best = s
    }
  }
  return best
}

/** Nadie con más de `cap` partidos (W+L+T) en el acumulado TDF. */
function snapshotCumulativeFitsLeagueCap(
  snapshot: LeanRoundSnapshot,
  nameByPop: Map<string, string>,
  cap: number
): boolean {
  const m = wlMapFromRoundSnapshot(snapshot, nameByPop)
  if (m.size === 0) return false
  for (const rec of m.values()) {
    if (rec.w + rec.l + rec.t > cap) return false
  }
  return true
}

/**
 * Snapshot para puntuar la liga con tope de `cap` rondas: suele alinearse con el
 * TDF de Play! (acumulado **tras 3** swiss a veces vive bajo el snapshot
 * "ronda 4" aún en curso). Candidatos: 1-based `1…cap+1`, 0-based `0…cap`
 * (incluida la "siguiente" ronda cuyo cierre aún no suma 4+ partidos). Elige
 * el de **mayor** `roundNum` cuyo W/L de ningún jugador supera el tope; si
 * ninguno califica, cae al rango estrecho.
 */
function pickLeagueCapSnapshot(
  snapshots: LeanRoundSnapshot[] | undefined,
  cap: number,
  nameByPop: Map<string, string>
): LeanRoundSnapshot | null {
  if (!snapshots?.length) return null
  const hasZero = snapshots.some(s => {
    const r = Math.round(Number(s.roundNum))
    return Number.isFinite(r) && r === 0
  })
  const candidates: { s: LeanRoundSnapshot; r: number }[] = []
  for (const s of snapshots) {
    const r = Math.round(Number(s.roundNum))
    if (!Number.isFinite(r)) continue
    if (hasZero) {
      if (r < 0 || r > cap) continue
    } else {
      if (r < 1 || r > cap + 1) continue
    }
    candidates.push({ s, r })
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.r - a.r)
  for (const { s } of candidates) {
    if (snapshotCumulativeFitsLeagueCap(s, nameByPop, cap)) {
      return s
    }
  }
  return pickRoundSnapshotNarrow(snapshots, cap)
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

type Wlt = { displayName: string; w: number; l: number; t: number }

/**
 * Récord W/L/T sumando solo las mesas con `1 ≤ roundNum ≤ cap` en `matchRounds`.
 * Es la fuente más fiable bajo tope: no depende del TDF atrasado ni del total
 * 4-0-0 del participante cuando el tope de liga es 3.
 */
function cappedWltByPopFromMatchRounds(
  ev: LeanEventForLeague,
  cap: number
): { map: Map<string, Wlt>; popIds: Set<string> } {
  const out = new Map<string, Wlt>()
  const popIds = new Set<string>()
  for (const p of ev.participants ?? []) {
    const k = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (!k) continue
    const rows = parseParticipantMatchRoundsFromLean(p.matchRounds).filter(
      r => r.roundNum >= 1 && r.roundNum <= cap
    )
    if (rows.length === 0) continue
    const { wins, losses, ties } = matchRecordFromRounds(rows)
    popIds.add(k)
    out.set(k, {
      displayName: p.displayName || '—',
      w: wins,
      l: losses,
      t: ties
    })
  }
  return { map: out, popIds }
}

/**
 * El snapshot TDF a veces trae W/L acumulado atrasado en la última ronda, mientras
 * `participants` ya refleja el torneo cerrado. Si el tope de liga es `cap` y el
 * récord del participante suma ≤ `cap` partidos, tiene **más** puntos de liga
 * (3W+1T) que el del snapshot, preferimos a participante.
 */
function mergeSnapshotWltWithParticipantsWhenStricter(
  cap: number,
  fromSnapshot: Map<string, Wlt>,
  fromParticipants: Map<string, Wlt>,
  skipPops: Set<string>
): Map<string, Wlt> {
  const out = new Map(fromSnapshot)
  for (const [k, rec] of fromSnapshot) {
    if (skipPops.has(k)) continue
    const p = fromParticipants.get(k)
    if (!p) continue
    const gamesP = p.w + p.l + p.t
    if (gamesP > cap) continue
    if (
      pointsFromWLRecord(p.w, p.l, p.t) >
      pointsFromWLRecord(rec.w, rec.l, rec.t)
    ) {
      out.set(k, {
        displayName:
          p.displayName && p.displayName !== '—'
            ? p.displayName
            : rec.displayName,
        w: p.w,
        l: p.l,
        t: p.t
      })
    }
  }
  return out
}

/**
 * Récord W/L/T usado para la liga en un torneo: respeta `dashboardRoundCap`.
 * Con tope, si el participante tiene `matchRounds` guardados, se suman solo las
 * rondas con `roundNum` ≤ tope; si no, se usa el snapshot TDF o totales
 * ajustados (ver merge con participantes).
 */
export function leagueMergeSource(ev: LeanEventForLeague): {
  byPop: Map<string, { displayName: string; w: number; l: number; t: number }>
  /** Ronda tope fijada en admin; para la explicación "hasta ronda N" en la liga. */
  leagueRoundBasis?: number
} {
  const cap = normalizeStoredDashboardRoundCap(ev.dashboardRoundCap)
  const nameByPop = participantNameByPop(ev)
  const fromParticipants = mergeParticipantsByPop(ev)

  if (cap === undefined) {
    return { byPop: fromParticipants }
  }

  const { map: fromMatchCapped, popIds: popsFromMatchRounds } =
    cappedWltByPopFromMatchRounds(ev, cap)
  const chosen = pickLeagueCapSnapshot(ev.roundSnapshots ?? [], cap, nameByPop)

  if (chosen) {
    const fromSnapshot = wlMapFromRoundSnapshot(chosen, nameByPop)
    const combined = new Map<string, Wlt>(fromSnapshot)
    for (const [k, wlt] of fromMatchCapped) {
      combined.set(k, wlt)
    }
    return {
      byPop: mergeSnapshotWltWithParticipantsWhenStricter(
        cap,
        combined,
        fromParticipants,
        popsFromMatchRounds
      ),
      leagueRoundBasis: cap
    }
  }

  if (fromMatchCapped.size > 0) {
    const byPop = new Map<string, Wlt>(fromMatchCapped)
    for (const [k, p] of fromParticipants) {
      if (byPop.has(k)) continue
      const gamesP = p.w + p.l + p.t
      if (gamesP <= cap) byPop.set(k, p)
    }
    return { byPop, leagueRoundBasis: cap }
  }

  if ((ev.roundSnapshots ?? []).length > 0) {
    return { byPop: new Map(), leagueRoundBasis: cap }
  }

  return { byPop: fromParticipants }
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

    const { byPop, leagueRoundBasis } = leagueMergeSource(ev)

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
        leagueRoundBasis
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
 * Con **tope** (`dashboardRoundCap`), prioriza `participants.matchRounds` (rondas
 * `1…N`); si no hay, el snapshot TDF a la ronda bajo tope, con la misma lógica
 * que en el panel.
 */
export function aggregateLeagueStandings(
  events: LeanEventForLeague[],
  countBestEvents: number | null | undefined
): LeagueStandingRow[] {
  const { popToName, playerDetails } = collectPlayerDetailsFromRecords(events)
  return finalizeStandings(popToName, playerDetails, countBestEvents)
}
