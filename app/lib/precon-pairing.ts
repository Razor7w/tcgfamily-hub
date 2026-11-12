export const PRECON_FIELD_SIZE = 16
export const PRECON_TABLE_SIZE = 4
export const PRECON_TABLE_COUNT = PRECON_FIELD_SIZE / PRECON_TABLE_SIZE
export const PRECON_ROUND_LIMIT = 3

/** 1 punto por rival eliminado. */
export const PRECON_KILL_POINTS = 1
/** 3 puntos por ganar la mesa. */
export const PRECON_WIN_POINTS = 3
/** Nadie suma más de 3 en la mesa. */
export const PRECON_POINTS_CAP = 3

export function preconTablePoints(input: {
  kills: number
  won: boolean
}): number {
  const kills = Number.isFinite(input.kills)
    ? Math.max(0, Math.floor(input.kills))
    : 0
  const raw = kills * PRECON_KILL_POINTS + (input.won ? PRECON_WIN_POINTS : 0)
  return Math.min(PRECON_POINTS_CAP, raw)
}

/** En una mesa de 4 solo pueden morir 3 rivales. */
export const PRECON_MAX_KILLS = PRECON_TABLE_SIZE - 1

export type PreconTableResult = {
  kills: number[]
  /** Asiento 0–3. Vacío si la mesa todavía no tiene ganador. */
  winner: number | null
  finished: boolean
}

export type PreconRound = {
  tables: number[][]
  results: PreconTableResult[]
}

export function emptyPreconResults(): PreconTableResult[] {
  return Array.from({ length: PRECON_TABLE_COUNT }, () => ({
    kills: Array.from({ length: PRECON_TABLE_SIZE }, () => 0),
    winner: null,
    finished: false
  }))
}

export function isPreconTableResult(
  value: unknown
): value is PreconTableResult {
  if (!value || typeof value !== 'object') return false
  const record = value as {
    kills?: unknown
    winner?: unknown
    finished?: unknown
  }
  if (
    !Array.isArray(record.kills) ||
    record.kills.length !== PRECON_TABLE_SIZE
  ) {
    return false
  }
  if (
    !record.kills.every(
      kill =>
        typeof kill === 'number' &&
        Number.isInteger(kill) &&
        kill >= 0 &&
        kill <= PRECON_MAX_KILLS
    )
  ) {
    return false
  }
  const total = record.kills.reduce((sum, kill) => sum + kill, 0)
  if (total > PRECON_MAX_KILLS) return false
  const winner = record.winner
  if (
    winner !== null &&
    (typeof winner !== 'number' ||
      !Number.isInteger(winner) ||
      winner < 0 ||
      winner >= PRECON_TABLE_SIZE)
  ) {
    return false
  }
  const swept = record.kills.findIndex(kill => kill === PRECON_MAX_KILLS)
  if (swept >= 0 && winner !== swept) return false
  if (record.finished !== undefined && typeof record.finished !== 'boolean') {
    return false
  }
  return true
}

export function preconSeatPoints(
  result: PreconTableResult,
  seat: number
): number | null {
  const started = result.winner !== null || result.kills.some(kill => kill > 0)
  if (!started) return null
  return preconTablePoints({
    kills: result.kills[seat] ?? 0,
    won: result.winner === seat
  })
}

export function preconMissingWinner(result: PreconTableResult): boolean {
  return result.kills.some(kill => kill > 0) && result.winner === null
}

export function preconKillChoices(
  result: PreconTableResult,
  seat: number
): number[] {
  const others = result.kills.reduce(
    (sum, kill, index) => sum + (index === seat ? 0 : kill),
    0
  )
  const max = Math.max(0, PRECON_MAX_KILLS - others)
  return Array.from({ length: max + 1 }, (_, kill) => kill)
}

export function withPreconKills(
  result: PreconTableResult,
  seat: number,
  kills: number
): PreconTableResult {
  if (result.finished) return result
  const choices = preconKillChoices(result, seat)
  const nextKill = choices.includes(kills) ? kills : (result.kills[seat] ?? 0)
  const nextKills = result.kills.map((kill, index) =>
    index === seat ? nextKill : kill
  )
  const winner = nextKill === PRECON_MAX_KILLS ? seat : result.winner
  return { kills: nextKills, winner, finished: false }
}

export function withPreconWinner(
  result: PreconTableResult,
  seat: number
): PreconTableResult {
  if (result.finished) return result
  const swept = result.kills.findIndex(kill => kill === PRECON_MAX_KILLS)
  if (swept >= 0) return { kills: result.kills, winner: swept, finished: false }
  return {
    kills: result.kills,
    winner: result.winner === seat ? null : seat,
    finished: false
  }
}

export function withPreconFinished(
  result: PreconTableResult,
  finished: boolean
): PreconTableResult {
  if (finished && result.winner === null) return result
  return { ...result, finished }
}

function randomInt(exclusiveMax: number): number {
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(1)
    const limit = Math.floor(0x1_0000_0000 / exclusiveMax) * exclusiveMax
    let value = 0
    do {
      cryptoObj.getRandomValues(buf)
      value = buf[0] ?? 0
    } while (value >= limit)
    return value % exclusiveMax
  }
  return Math.floor(Math.random() * exclusiveMax)
}

/**
 * Primera ronda: los 16 jugadores se mezclan en 4 mesas.
 * Cada mesa es una lista de índices (0–15).
 */
export function pairPreconFirstRound(names: readonly string[]): number[][] {
  const cleaned = names.map(name => name.trim())
  if (
    cleaned.length !== PRECON_FIELD_SIZE ||
    cleaned.some(name => name.length === 0)
  ) {
    throw new Error('Hacen falta 16 nombres para armar la primera ronda.')
  }

  const order = cleaned.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    const current = order[i]
    order[i] = order[j] ?? j
    order[j] = current ?? i
  }

  const tables: number[][] = []
  for (let table = 0; table < PRECON_TABLE_COUNT; table += 1) {
    const start = table * PRECON_TABLE_SIZE
    tables.push(order.slice(start, start + PRECON_TABLE_SIZE))
  }
  return tables
}

function tablePointSum(
  table: readonly number[],
  points: readonly number[]
): number {
  return table.reduce((sum, player) => sum + (points[player] ?? 0), 0)
}

function sortTablesByPoints(
  tables: number[][],
  points: readonly number[]
): number[][] {
  return [...tables].sort(
    (left, right) => tablePointSum(right, points) - tablePointSum(left, points)
  )
}

/**
 * Segunda y tercera ronda: nadie se sienta con un rival que ya tuvo.
 * En la segunda, los cuatro ganadores quedan juntos.
 * En la tercera se elige, entre las mesas sin rivales repetidos, la de puntajes más parejos.
 */
export function pairPreconNextRound(
  rounds: readonly PreconRound[]
): number[][] {
  if (rounds.length === 0) {
    throw new Error('No hay una ronda anterior para continuar.')
  }
  if (rounds.length >= PRECON_ROUND_LIMIT) {
    throw new Error('El precon termina en la ronda 3.')
  }
  if (rounds.some(round => round.results.some(result => !result.finished))) {
    throw new Error(
      'Termina las cuatro mesas antes de lanzar la siguiente ronda.'
    )
  }

  const points = totalPreconPoints(rounds)
  if (rounds.length === 1) {
    return sortTablesByPoints(pairSecondRound(rounds[0]), points)
  }
  const grid = seatGrid(rounds[0]?.tables ?? [], rounds[1]?.tables ?? [])
  if (!grid) {
    throw new Error('No se pudo armar la ronda 3 sin repetir rivales.')
  }
  return sortTablesByPoints(pairThirdRound(grid, points), points)
}

export function totalPreconPoints(rounds: readonly PreconRound[]): number[] {
  const points = Array.from({ length: PRECON_FIELD_SIZE }, () => 0)
  for (const round of rounds) {
    round.tables.forEach((seats, tableIndex) => {
      const result = round.results[tableIndex]
      if (!result) return
      seats.forEach((player, seat) => {
        const scored = preconSeatPoints(result, seat)
        if (scored !== null) points[player] = (points[player] ?? 0) + scored
      })
    })
  }
  return points
}

function pairSecondRound(round: PreconRound): number[][] {
  const columns: number[][] = Array.from(
    { length: PRECON_TABLE_COUNT },
    () => []
  )
  round.tables.forEach((seats, tableIndex) => {
    const result = round.results[tableIndex]
    const ranked = seats.map((player, seat) => ({
      player,
      points: result ? (preconSeatPoints(result, seat) ?? 0) : 0,
      tie: randomInt(1_000_000)
    }))
    ranked.sort(
      (left, right) => right.points - left.points || left.tie - right.tie
    )
    ranked.forEach((entry, column) => {
      columns[column]?.push(entry.player)
    })
  })
  return columns
}

function seatGrid(
  roundOne: readonly number[][],
  roundTwo: readonly number[][]
): number[][] | null {
  const rowOf = new Map<number, number>()
  const columnOf = new Map<number, number>()
  roundOne.forEach((table, row) => {
    table.forEach(player => rowOf.set(player, row))
  })
  roundTwo.forEach((table, column) => {
    table.forEach(player => columnOf.set(player, column))
  })
  const grid: number[][] = Array.from({ length: PRECON_TABLE_COUNT }, () =>
    Array.from({ length: PRECON_TABLE_COUNT }, () => -1)
  )
  for (let player = 0; player < PRECON_FIELD_SIZE; player += 1) {
    const row = rowOf.get(player)
    const column = columnOf.get(player)
    if (row === undefined || column === undefined) return null
    if (grid[row]?.[column] !== -1) return null
    const line = grid[row]
    if (!line) return null
    line[column] = player
  }
  return grid
}

function pairThirdRound(
  grid: number[][],
  points: readonly number[]
): number[][] {
  const assignment: number[][] = Array.from(
    { length: PRECON_TABLE_COUNT },
    () => Array.from({ length: PRECON_TABLE_COUNT }, () => -1)
  )
  const rowUsed = Array.from({ length: PRECON_TABLE_COUNT }, () =>
    Array.from({ length: PRECON_TABLE_COUNT }, () => false)
  )
  const columnUsed = Array.from({ length: PRECON_TABLE_COUNT }, () =>
    Array.from({ length: PRECON_TABLE_COUNT }, () => false)
  )
  let bestKey = ''
  let bestTables: number[][][] = []

  const consider = () => {
    const tables: number[][] = Array.from(
      { length: PRECON_TABLE_COUNT },
      () => []
    )
    for (let row = 0; row < PRECON_TABLE_COUNT; row += 1) {
      for (let column = 0; column < PRECON_TABLE_COUNT; column += 1) {
        const symbol = assignment[row]?.[column] ?? -1
        const player = grid[row]?.[column] ?? -1
        tables[symbol]?.push(player)
      }
    }
    const spread = tables.reduce((sum, table) => {
      const scored = table.map(player => points[player] ?? 0)
      return sum + Math.max(...scored) - Math.min(...scored)
    }, 0)
    const top = Math.max(...tables.map(table => tablePointSum(table, points)))
    const key = `${String(spread).padStart(3, '0')}-${String(999 - top).padStart(3, '0')}`
    if (bestTables.length === 0 || key < bestKey) {
      bestKey = key
      bestTables = [tables]
    } else if (key === bestKey) {
      bestTables.push(tables)
    }
  }

  const fill = (cell: number) => {
    if (cell === PRECON_FIELD_SIZE) {
      consider()
      return
    }
    const row = Math.floor(cell / PRECON_TABLE_COUNT)
    const column = cell % PRECON_TABLE_COUNT
    for (let symbol = 0; symbol < PRECON_TABLE_COUNT; symbol += 1) {
      if (rowUsed[row]?.[symbol] || columnUsed[column]?.[symbol]) continue
      const rowFlags = rowUsed[row]
      const columnFlags = columnUsed[column]
      const line = assignment[row]
      if (!rowFlags || !columnFlags || !line) continue
      rowFlags[symbol] = true
      columnFlags[symbol] = true
      line[column] = symbol
      fill(cell + 1)
      rowFlags[symbol] = false
      columnFlags[symbol] = false
    }
  }

  fill(0)
  if (bestTables.length === 0) {
    throw new Error('No hay mesas sin rivales repetidos para la ronda 3.')
  }
  return bestTables[randomInt(bestTables.length)] ?? bestTables[0] ?? []
}
