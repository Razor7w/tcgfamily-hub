import { popidForStorage } from '@/lib/rut-chile'

/**
 * Emparejamiento Swiss estilo Play! Pokémon / TOM:
 * - Ronda 1: aleatorio
 * - Rondas 2+: jugadores con récord/puntos similar, sin repetir rival
 * - Grupos con cantidad impar: el de menor puntaje del grupo "flota" al siguiente
 * - Bye: máx. 1 por jugador; prioriza menor puntaje entre quienes no tuvieron bye
 *
 * @see Play! Pokémon Tournament Rules Handbook §4.6 (Swiss Pairing)
 */

export type SwissPlayer = {
  popId: string
  displayName: string
  wins: number
  losses: number
  ties: number
}

export type SwissPairingResult = {
  tableNumber: string
  player1PopId: string
  player2PopId: string
  player1Name: string
  player2Name: string
  player1Record: { wins: number; losses: number; ties: number }
  player2Record: { wins: number; losses: number; ties: number }
  isBye: boolean
}

export type SwissPairingHistoryRow = {
  player1PopId: string
  player2PopId: string
  isBye?: boolean
}

/** Puntos de partida Play! (3 / 1 / 0). */
export function swissMatchPoints(p: SwissPlayer): number {
  return Math.max(0, Math.round(p.wins)) * 3 + Math.max(0, Math.round(p.ties))
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function opponentKey(a: string, b: string): string {
  return [a, b].sort().join(':')
}

function popKey(raw: string): string {
  return popidForStorage(typeof raw === 'string' ? raw : '')
}

function recordOf(p: SwissPlayer) {
  return {
    wins: Math.max(0, Math.round(p.wins)),
    losses: Math.max(0, Math.round(p.losses)),
    ties: Math.max(0, Math.round(p.ties))
  }
}

/** Orden para emparejar: más puntos → más W → menos L → más T → POP. */
export function compareSwissPlayersForPairing(
  a: SwissPlayer,
  b: SwissPlayer
): number {
  const pa = swissMatchPoints(a)
  const pb = swissMatchPoints(b)
  if (pb !== pa) return pb - pa
  if (b.wins !== a.wins) return b.wins - a.wins
  if (a.losses !== b.losses) return a.losses - b.losses
  if (b.ties !== a.ties) return b.ties - a.ties
  return a.popId.localeCompare(b.popId)
}

function sortSwissPlayers(players: SwissPlayer[]): SwissPlayer[] {
  return [...players].sort(compareSwissPlayersForPairing)
}

function buildHistory(pairings: SwissPairingHistoryRow[]): Set<string> {
  const set = new Set<string>()
  for (const p of pairings) {
    if (p.isBye || !p.player2PopId?.trim()) continue
    const a = popKey(p.player1PopId)
    const b = popKey(p.player2PopId)
    if (!a || !b) continue
    set.add(opponentKey(a, b))
  }
  return set
}

function byeCountsFromHistory(
  pairings: SwissPairingHistoryRow[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const p of pairings) {
    if (p.isBye || !p.player2PopId?.trim()) {
      const key = popKey(p.player1PopId)
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return map
}

function toTablePairings(
  pairs: { p1: SwissPlayer; p2: SwissPlayer | null }[]
): SwissPairingResult[] {
  return pairs.map((pair, idx) => {
    const tableNumber = String(idx + 1)
    if (!pair.p2) {
      return {
        tableNumber,
        player1PopId: pair.p1.popId,
        player2PopId: '',
        player1Name: pair.p1.displayName,
        player2Name: '',
        player1Record: recordOf(pair.p1),
        player2Record: { wins: 0, losses: 0, ties: 0 },
        isBye: true
      }
    }
    return {
      tableNumber,
      player1PopId: pair.p1.popId,
      player2PopId: pair.p2.popId,
      player1Name: pair.p1.displayName,
      player2Name: pair.p2.displayName,
      player1Record: recordOf(pair.p1),
      player2Record: recordOf(pair.p2),
      isBye: false
    }
  })
}

function groupByMatchPoints(players: SwissPlayer[]): SwissPlayer[][] {
  const byPts = new Map<number, SwissPlayer[]>()
  for (const p of players) {
    const pts = swissMatchPoints(p)
    const bucket = byPts.get(pts) ?? []
    bucket.push(p)
    byPts.set(pts, bucket)
  }
  return [...byPts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, bucket]) => sortSwissPlayers(bucket))
}

/**
 * Grupos por puntos con float descendente (jugador más bajo del bracket impar
 * baja al siguiente grupo de puntos).
 */
export function buildSwissPairingPools(
  players: SwissPlayer[]
): SwissPlayer[][] {
  const groups = groupByMatchPoints(players)
  const pools: SwissPlayer[][] = []
  let floater: SwissPlayer | null = null

  for (let i = 0; i < groups.length; i++) {
    const merged = floater ? [...groups[i], floater] : [...groups[i]]
    floater = null
    const sorted = sortSwissPlayers(merged)

    if (sorted.length === 0) continue

    if (sorted.length % 2 === 1) {
      floater = sorted.pop()!
    }

    if (sorted.length > 0) {
      pools.push(sorted)
    }
  }

  if (floater) {
    pools.push([floater])
  }

  return pools
}

function hasPlayed(a: string, b: string, history: Set<string>): boolean {
  return history.has(opponentKey(a, b))
}

/**
 * Empareja un bracket: aleatorio dentro del grupo (Play!) y sin rematches.
 * Backtracking para brackets pequeños; fallback greedy si no hay solución.
 */
function pairBracket(
  players: SwissPlayer[],
  history: Set<string>
): { p1: SwissPlayer; p2: SwissPlayer }[] {
  if (players.length < 2) return []

  const seeds = shuffle(players)

  function backtrack(
    remaining: SwissPlayer[]
  ): { p1: SwissPlayer; p2: SwissPlayer }[] | null {
    if (remaining.length === 0) return []
    if (remaining.length === 1) return null

    const p1 = remaining[0]
    const rest = remaining.slice(1)

    const candidates = shuffle(
      rest
        .map((p2, idx) => ({ p2, idx }))
        .filter(c => !hasPlayed(p1.popId, c.p2.popId, history))
    )

    for (const { p2, idx } of candidates) {
      const next = [...rest.slice(0, idx), ...rest.slice(idx + 1)]
      const tail = backtrack(next)
      if (tail) return [{ p1, p2 }, ...tail]
    }

    return null
  }

  const optimal = backtrack(seeds)
  if (optimal) return optimal

  const pairs: { p1: SwissPlayer; p2: SwissPlayer }[] = []
  const remaining = [...seeds]
  while (remaining.length >= 2) {
    const p1 = remaining.shift()!
    let pickIdx = remaining.findIndex(
      p2 => !hasPlayed(p1.popId, p2.popId, history)
    )
    if (pickIdx === -1) pickIdx = 0
    const p2 = remaining.splice(pickIdx, 1)[0]
    pairs.push({ p1, p2 })
  }

  return pairs
}

/** Bye al jugador elegible con menos puntos (máx. 1 bye por jugador). */
function pickByePlayer(
  players: SwissPlayer[],
  byeCounts: Map<string, number>
): SwissPlayer {
  const withoutBye = players.filter(p => (byeCounts.get(p.popId) ?? 0) === 0)

  const pool = withoutBye.length > 0 ? withoutBye : players
  return [...pool].sort((a, b) => {
    const byes = (byeCounts.get(a.popId) ?? 0) - (byeCounts.get(b.popId) ?? 0)
    if (byes !== 0) return byes
    return compareSwissPlayersForPairing(a, b)
  })[pool.length - 1]!
}

function pairRoundOne(players: SwissPlayer[]): SwissPairingResult[] {
  const shuffled = shuffle(players)
  const pairs: { p1: SwissPlayer; p2: SwissPlayer | null }[] = []
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push({ p1: shuffled[i], p2: shuffled[i + 1] })
    } else {
      pairs.push({ p1: shuffled[i], p2: null })
    }
  }
  return toTablePairings(pairs)
}

function pairSwissSubsequent(args: {
  players: SwissPlayer[]
  history: Set<string>
  byeCounts: Map<string, number>
}): SwissPairingResult[] {
  let pool = sortSwissPlayers(args.players)
  const pairs: { p1: SwissPlayer; p2: SwissPlayer | null }[] = []

  if (pool.length % 2 === 1) {
    const bye = pickByePlayer(pool, args.byeCounts)
    pool = pool.filter(p => p.popId !== bye.popId)
    pairs.push({ p1: bye, p2: null })
  }

  const brackets = buildSwissPairingPools(pool)
  for (const bracket of brackets) {
    if (bracket.length === 1) {
      pairs.push({ p1: bracket[0], p2: null })
      continue
    }
    const bracketPairs = pairBracket(bracket, args.history)
    for (const bp of bracketPairs) {
      pairs.push(bp)
      args.history.add(opponentKey(bp.p1.popId, bp.p2.popId))
    }
  }

  return toTablePairings(pairs)
}

/** Emparejamiento Swiss (Play! Pokémon / TOM). */
export function generateSwissPairings(args: {
  players: SwissPlayer[]
  roundNum: number
  previousPairings: SwissPairingHistoryRow[]
}): SwissPairingResult[] {
  const active = args.players
    .map(p => ({
      ...p,
      popId: popKey(p.popId) || p.popId.trim()
    }))
    .filter(p => p.popId.length > 0)

  if (active.length < 2 && active.length !== 1) {
    return []
  }
  if (active.length === 1) {
    return toTablePairings([{ p1: active[0], p2: null }])
  }

  if (args.roundNum <= 1) {
    return pairRoundOne(active)
  }

  const history = buildHistory(args.previousPairings)
  const byeCounts = byeCountsFromHistory(args.previousPairings)
  return pairSwissSubsequent({ players: active, history, byeCounts })
}
