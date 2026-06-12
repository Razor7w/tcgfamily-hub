import type {
  MatchRecord,
  ParsedMatch,
  ParsedPlayer
} from '@/lib/tournament-xml'
export { buildMatchRecordsFromMatches } from '@/lib/tournament-xml'
import { inferPlayCategoryIndexForPlayer } from '@/lib/inferred-tdf-standings'

function matchPointsFromRecord(r: MatchRecord): number {
  return r.wins * 3 + r.ties
}

/** Suelo Play! / TOM en Op Win % y Opponents' Op Win % (25 %). */
export const OPPONENT_WIN_PCT_FLOOR = 0.25

/**
 * Ajuste OOWP TOM: al promediar OWP de rivales retirados, suma 12,5 % (½ del suelo).
 * Solo aplica en la cadena OOWP, no en OWP.
 */
export const OOWP_DROPPED_OPPONENT_OWP_BOOST = 0.125

export const OPPONENT_WIN_PCT_CAP_FINISHED = 1

/**
 * Techo handbook para drops (75 %). TOM en la práctica no lo aplica al export;
 * se conserva la constante por referencia documental.
 */
export const OPPONENT_WIN_PCT_CAP_DROPPED = 0.75

export type PlayerTiebreakers = {
  matchPoints: number
  owp: number
  oowp: number
}

export type TiebreakerOptions = {
  /** Si true, solo rivales de la misma categoría Play! (edad). */
  sameCategoryOnly?: boolean
}

export type TiebreakerMatchContext = {
  swissMatches: ParsedMatch[]
  /** Récord solo partidas suizo con dos jugadores (sin bye). */
  swissRecords: Map<string, MatchRecord>
  droppedPopIds?: ReadonlySet<string>
  playersByPopId?: Map<string, ParsedPlayer>
  options?: TiebreakerOptions
}

export function formatTiebreakerPercent(ratio: number): string {
  const pct = ratio * 100
  if (pct >= 100 || pct <= 0) return `${pct.toFixed(0)}%`
  return `${pct.toFixed(2)}%`
}

/** Win % de un rival para OWP/OOWP (TOM: suelo 25 %, techo 100 %). */
function clampOpponentWinPct(raw: number): number {
  return Math.min(
    OPPONENT_WIN_PCT_CAP_FINISHED,
    Math.max(OPPONENT_WIN_PCT_FLOOR, raw)
  )
}

function isScoredMatch(m: ParsedMatch): boolean {
  const u1 = m.player1UserId.trim()
  const u2 = m.player2UserId.trim()
  const o = m.outcome.trim()
  if (u1 && !u2) return false
  if (!u1 || !u2) return false
  return o === '1' || o === '2' || o === '3'
}

/** Bye TOM: un solo jugador en la mesa (outcome 5 u otro). */
function isByeMatch(m: ParsedMatch): boolean {
  const u1 = m.player1UserId.trim()
  const u2 = m.player2UserId.trim()
  return Boolean(u1 && !u2)
}

/** Mesa suizo para contar rondas (incluye bye; excluye mesas vacías o sin resultado). */
function isSwissTableSlot(m: ParsedMatch): boolean {
  return isScoredMatch(m) || isByeMatch(m)
}

function matchCountByRound(matches: ParsedMatch[]): Map<number, number> {
  const countByRound = new Map<number, number>()
  for (const m of matches) {
    if (!isSwissTableSlot(m)) continue
    countByRound.set(m.roundNumber, (countByRound.get(m.roundNumber) ?? 0) + 1)
  }
  return countByRound
}

/**
 * Partidas de rondas suizo.
 * Umbral ≈ ⌊N/2⌋ mesas por ronda (bye cuenta como mesa); −1 tolera drops tardíos.
 * Excluye cortes finales (1–2 mesas).
 */
export function filterMatchesForTiebreakers(
  matches: ParsedMatch[],
  fieldSize: number
): ParsedMatch[] {
  const n = Math.max(2, Math.floor(fieldSize))
  const countByRound = matchCountByRound(matches)
  const swissTableThreshold = Math.max(2, Math.floor(n / 2) - 1)

  return matches.filter(m => {
    if (!isScoredMatch(m)) return false
    return (countByRound.get(m.roundNumber) ?? 0) >= swissTableThreshold
  })
}

function modeRoundsPlayed(records: Map<string, MatchRecord>): number {
  const freq = new Map<number, number>()
  for (const r of records.values()) {
    const n = r.wins + r.losses + r.ties
    if (n <= 0) continue
    freq.set(n, (freq.get(n) ?? 0) + 1)
  }
  let best = 0
  let bestCount = 0
  for (const [n, c] of freq) {
    if (c > bestCount) {
      bestCount = c
      best = n
    }
  }
  return best
}

/** Victorias y rondas jugadas sin byes (solo partidas con dos jugadores). */
export function buildMatchRecordsExcludingByes(
  matches: ParsedMatch[]
): Map<string, MatchRecord> {
  const map = new Map<string, MatchRecord>()
  const bump = (id: string) => {
    if (!id) return undefined
    let r = map.get(id)
    if (!r) {
      r = { wins: 0, losses: 0, ties: 0 }
      map.set(id, r)
    }
    return r
  }

  for (const m of matches) {
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    const o = m.outcome.trim()
    if (u1 && !u2) continue
    if (!u1 || !u2) continue
    if (o === '1') {
      bump(u1)!.wins++
      bump(u2)!.losses++
    } else if (o === '2') {
      bump(u2)!.wins++
      bump(u1)!.losses++
    } else if (o === '3') {
      bump(u1)!.ties++
      bump(u2)!.ties++
    }
  }
  return map
}

export function swissRoundCountForTiebreakers(
  matches: ParsedMatch[],
  fieldSize: number,
  swissRecords?: Map<string, MatchRecord>
): number {
  const swiss = filterMatchesForTiebreakers(matches, fieldSize)
  const rounds = new Set<number>()
  for (const m of swiss) rounds.add(m.roundNumber)
  const bySwissTables = rounds.size

  const mode =
    swissRecords && swissRecords.size > 0
      ? modeRoundsPlayed(swissRecords)
      : swiss.length > 0
        ? modeRoundsPlayed(buildMatchRecordsExcludingByes(swiss))
        : 0

  if (bySwissTables > 0 && mode > 0) {
    return Math.min(bySwissTables, mode)
  }
  if (bySwissTables > 0) return bySwissTables
  if (mode > 0) return mode

  let max = 0
  for (const m of matches) {
    if (!isScoredMatch(m)) continue
    max = Math.max(max, m.roundNumber)
  }
  return max
}

/**
 * Win % de un jugador para desempates (TOM / swissiwashi):
 * (W + 0,5×T) ÷ rondas con rival en suizo (sin bye), mínimo 25 %.
 * Los drops siguen en la lista de rivales; su % cuenta con el mismo suelo.
 */
export function playerWinPercentForTiebreaker(
  popId: string,
  ctx: TiebreakerMatchContext
): number {
  const rec = ctx.swissRecords.get(popId) ?? {
    wins: 0,
    losses: 0,
    ties: 0
  }
  const roundsPlayed = rec.wins + rec.losses + rec.ties

  if (roundsPlayed <= 0) return OPPONENT_WIN_PCT_FLOOR

  const raw = (rec.wins + 0.5 * rec.ties) / roundsPlayed
  return clampOpponentWinPct(raw)
}

export function buildOpponentSetsFromMatches(
  matches: ParsedMatch[],
  ctx?: Pick<TiebreakerMatchContext, 'playersByPopId' | 'options'>
): Map<string, Set<string>> {
  const opponents = new Map<string, Set<string>>()
  const sameCatOnly = ctx?.options?.sameCategoryOnly ?? false

  const categoryOf = (pop: string): number => {
    const p = ctx?.playersByPopId?.get(pop)
    return p ? inferPlayCategoryIndexForPlayer(p) : 1
  }

  const addOpp = (a: string, b: string) => {
    if (!a || !b || a === b) return
    if (sameCatOnly && categoryOf(a) !== categoryOf(b)) return
    let sa = opponents.get(a)
    if (!sa) {
      sa = new Set()
      opponents.set(a, sa)
    }
    sa.add(b)
    let sb = opponents.get(b)
    if (!sb) {
      sb = new Set()
      opponents.set(b, sb)
    }
    sb.add(a)
  }

  for (const m of matches) {
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    const o = m.outcome.trim()
    if (u1 && !u2) continue
    if (!u1 || !u2) continue
    if (o !== '1' && o !== '2' && o !== '3') continue
    addOpp(u1, u2)
  }
  return opponents
}

function average(values: number[]): number {
  if (values.length === 0) return OPPONENT_WIN_PCT_FLOOR
  return values.reduce((s, v) => s + v, 0) / values.length
}

/** OWP de un rival tal como entra al promedio OOWP (TOM: +12,5 % si retiró). */
function opponentOwpForOowp(
  oppPop: string,
  rawOwp: number,
  ctx: TiebreakerMatchContext
): number {
  if (!ctx.droppedPopIds?.has(oppPop)) return rawOwp
  return Math.min(
    OPPONENT_WIN_PCT_CAP_FINISHED,
    rawOwp + OOWP_DROPPED_OPPONENT_OWP_BOOST
  )
}

export function buildPlayerTiebreakersFromMatches(
  matches: ParsedMatch[],
  records: Map<string, MatchRecord>,
  droppedPopIds?: ReadonlySet<string>,
  fieldSize?: number,
  players?: ParsedPlayer[],
  options?: TiebreakerOptions
): Map<string, PlayerTiebreakers> {
  const n = Math.max(fieldSize ?? 0, records.size, 2)
  const swissMatches = filterMatchesForTiebreakers(matches, n)
  const swissRecordsExByes = buildMatchRecordsExcludingByes(swissMatches)

  const playersByPopId = new Map<string, ParsedPlayer>()
  for (const p of players ?? []) {
    if (p.popId.trim()) playersByPopId.set(p.popId.trim(), p)
  }

  const ctx: TiebreakerMatchContext = {
    swissMatches,
    swissRecords: swissRecordsExByes,
    droppedPopIds,
    playersByPopId,
    options
  }

  const opponents = buildOpponentSetsFromMatches(swissMatches, ctx)
  const winPctByPop = new Map<string, number>()
  const owpByPop = new Map<string, number>()

  const allPops = new Set<string>(records.keys())
  for (const pop of opponents.keys()) allPops.add(pop)

  for (const pop of allPops) {
    winPctByPop.set(pop, playerWinPercentForTiebreaker(pop, ctx))
  }

  for (const pop of allPops) {
    const opps = opponents.get(pop)
    if (!opps || opps.size === 0) {
      owpByPop.set(pop, OPPONENT_WIN_PCT_FLOOR)
      continue
    }
    const vals: number[] = []
    for (const opp of opps) {
      vals.push(winPctByPop.get(opp) ?? OPPONENT_WIN_PCT_FLOOR)
    }
    owpByPop.set(pop, average(vals))
  }

  const out = new Map<string, PlayerTiebreakers>()
  for (const pop of allPops) {
    const rec = records.get(pop) ?? { wins: 0, losses: 0, ties: 0 }
    const opps = opponents.get(pop)
    let oowp = OPPONENT_WIN_PCT_FLOOR
    if (opps && opps.size > 0) {
      const vals: number[] = []
      for (const opp of opps) {
        const raw = owpByPop.get(opp) ?? OPPONENT_WIN_PCT_FLOOR
        vals.push(opponentOwpForOowp(opp, raw, ctx))
      }
      oowp = average(vals)
    }
    out.set(pop, {
      matchPoints: matchPointsFromRecord(rec),
      owp: owpByPop.get(pop) ?? OPPONENT_WIN_PCT_FLOOR,
      oowp
    })
  }
  return out
}

export function comparePopIdsForStandings(
  popA: string,
  popB: string,
  records: Map<string, MatchRecord>,
  tiebreakers: Map<string, PlayerTiebreakers>,
  droppedPopIds?: ReadonlySet<string>
): number {
  const dropA = droppedPopIds?.has(popA) ?? false
  const dropB = droppedPopIds?.has(popB) ?? false
  if (dropA !== dropB) return dropA ? 1 : -1

  const ra = records.get(popA) ?? { wins: 0, losses: 0, ties: 0 }
  const rb = records.get(popB) ?? { wins: 0, losses: 0, ties: 0 }
  const ta = tiebreakers.get(popA)
  const tb = tiebreakers.get(popB)
  const pa = ta?.matchPoints ?? matchPointsFromRecord(ra)
  const pb = tb?.matchPoints ?? matchPointsFromRecord(rb)
  if (pb !== pa) return pb - pa
  if (rb.wins !== ra.wins) return rb.wins - ra.wins
  if (ra.losses !== rb.losses) return ra.losses - rb.losses
  if (rb.ties !== ra.ties) return rb.ties - ra.ties
  const owpA = ta?.owp ?? OPPONENT_WIN_PCT_FLOOR
  const owpB = tb?.owp ?? OPPONENT_WIN_PCT_FLOOR
  if (owpB !== owpA) return owpB > owpA ? 1 : -1
  const oowpA = ta?.oowp ?? OPPONENT_WIN_PCT_FLOOR
  const oowpB = tb?.oowp ?? OPPONENT_WIN_PCT_FLOOR
  if (oowpB !== oowpA) return oowpB > oowpA ? 1 : -1
  return popA.localeCompare(popB)
}
