export const PRECON_TABLE_SIZE = 4
export const PRECON_MIN_PLAYERS = 8
export const PRECON_MAX_PLAYERS = 32
export const PRECON_DEFAULT_PLAYERS = 16
export const PRECON_DEFAULT_ROUNDS = 3

export type PreconSettings = {
  players: number
  rounds: number
}

export const PRECON_DEFAULT_SETTINGS: PreconSettings = {
  players: PRECON_DEFAULT_PLAYERS,
  rounds: PRECON_DEFAULT_ROUNDS
}

export function preconTableCount(settings: PreconSettings): number {
  return settings.players / PRECON_TABLE_SIZE
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

/** El mínimo es 8 y la cantidad tiene que llenar mesas de 4. */
export function normalizePreconPlayers(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed)) return PRECON_DEFAULT_PLAYERS
  const snapped = Math.round(parsed / PRECON_TABLE_SIZE) * PRECON_TABLE_SIZE
  return Math.min(PRECON_MAX_PLAYERS, Math.max(PRECON_MIN_PLAYERS, snapped))
}

export function normalizePreconSettings(value: unknown): PreconSettings {
  const record =
    value && typeof value === 'object' ? (value as Partial<PreconSettings>) : {}
  return {
    players: normalizePreconPlayers(record.players),
    rounds: clampInt(record.rounds, 1, 5, PRECON_DEFAULT_ROUNDS)
  }
}

export function preconSettingsError(input: {
  players: number
  rounds: number
}): string | null {
  if (!Number.isInteger(input.players) || input.players < PRECON_MIN_PLAYERS) {
    return 'El mínimo es 8 jugadores.'
  }
  if (input.players > PRECON_MAX_PLAYERS) {
    return 'El máximo es 32 jugadores.'
  }
  if (input.players % PRECON_TABLE_SIZE !== 0) {
    return 'Los jugadores tienen que ser múltiplo de 4 para llenar las mesas.'
  }
  if (!Number.isInteger(input.rounds) || input.rounds < 1 || input.rounds > 5) {
    return 'Las rondas van de 1 a 5.'
  }
  return null
}

/** Puntos anotados a mano en cada asiento. */
export type PreconTableResult = {
  points: number[]
  finished: boolean
}

function emptyPoints(): number[] {
  return Array.from({ length: PRECON_TABLE_SIZE }, () => 0)
}

export type PreconRound = {
  tables: number[][]
  results: PreconTableResult[]
}

export function emptyPreconResults(
  settings: PreconSettings = PRECON_DEFAULT_SETTINGS
): PreconTableResult[] {
  return Array.from({ length: preconTableCount(settings) }, () => ({
    points: emptyPoints(),
    finished: false
  }))
}

function seatPoints(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== PRECON_TABLE_SIZE) return null
  const points: number[] = []
  for (const entry of value) {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0) {
      return null
    }
    points.push(entry)
  }
  return points
}

/** Mesas guardadas con bajas y ganador pasan a puntos, con las reglas de entonces. */
function legacySeatPoints(value: {
  kills?: unknown
  winner?: unknown
  tied?: unknown
  alive?: unknown
}): number[] | null {
  const kills = value.kills
  if (!Array.isArray(kills) || kills.length !== PRECON_TABLE_SIZE) {
    return null
  }
  if (
    !kills.every(
      (kill): kill is number =>
        typeof kill === 'number' &&
        Number.isInteger(kill) &&
        kill >= 0 &&
        kill <= 3
    )
  ) {
    return null
  }
  const total = kills.reduce((sum, kill) => sum + kill, 0)
  if (total > 3) return null
  const winner = value.winner
  if (
    winner !== null &&
    winner !== undefined &&
    (typeof winner !== 'number' ||
      !Number.isInteger(winner) ||
      winner < 0 ||
      winner >= PRECON_TABLE_SIZE)
  ) {
    return null
  }
  const tied = value.tied === true && (winner === null || winner === undefined)
  const alive = Array.isArray(value.alive) ? value.alive : []
  return kills.map((kill, seat) => {
    const raw =
      kill + (winner === seat ? 3 : 0) + (tied && alive[seat] === true ? 1 : 0)
    return Math.min(3, raw)
  })
}

export function readPreconTableResult(
  value: unknown
): PreconTableResult | null {
  if (!value || typeof value !== 'object') return null
  const record = value as {
    points?: unknown
    finished?: unknown
    kills?: unknown
    winner?: unknown
    tied?: unknown
    alive?: unknown
  }
  const points = seatPoints(record.points) ?? legacySeatPoints(record)
  if (!points) return null
  if (record.finished !== undefined && typeof record.finished !== 'boolean') {
    return null
  }
  return { points, finished: record.finished === true }
}

export function preconSeatPoints(
  result: PreconTableResult,
  seat: number
): number | null {
  const touched = result.finished || result.points.some(point => point > 0)
  if (!touched) return null
  return result.points[seat] ?? 0
}

export function withPreconPoints(
  result: PreconTableResult,
  seat: number,
  points: number
): PreconTableResult {
  if (result.finished) return result
  const next = Math.floor(Number(points))
  if (!Number.isFinite(next) || next < 0) return result
  return {
    ...result,
    points: result.points.map((current, index) =>
      index === seat ? next : current
    )
  }
}

export function withPreconFinished(
  result: PreconTableResult,
  finished: boolean
): PreconTableResult {
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
export function pairPreconFirstRound(
  names: readonly string[],
  settings: PreconSettings = PRECON_DEFAULT_SETTINGS
): number[][] {
  const cleaned = names.map(name => name.trim())
  if (
    cleaned.length !== settings.players ||
    cleaned.some(name => name.length === 0)
  ) {
    throw new Error(
      `Hacen falta ${settings.players} nombres para armar la primera ronda.`
    )
  }

  const order = cleaned.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    const current = order[i]
    order[i] = order[j] ?? j
    order[j] = current ?? i
  }

  const tableCount = preconTableCount(settings)
  const tables: number[][] = []
  for (let table = 0; table < tableCount; table += 1) {
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
  rounds: readonly PreconRound[],
  settings: PreconSettings = PRECON_DEFAULT_SETTINGS
): number[][] {
  if (rounds.length === 0) {
    throw new Error('No hay una ronda anterior para continuar.')
  }
  if (rounds.length >= settings.rounds) {
    throw new Error(`El precon termina en la ronda ${settings.rounds}.`)
  }
  if (rounds.some(round => round.results.some(result => !result.finished))) {
    throw new Error(
      'Termina las mesas de la ronda antes de lanzar la siguiente.'
    )
  }

  const points = totalPreconPoints(rounds, settings)
  const previous = rounds[0]
  if (settings.players === PRECON_DEFAULT_PLAYERS && rounds.length === 1) {
    if (!previous) {
      throw new Error('No hay una ronda anterior para continuar.')
    }
    return sortTablesByPoints(pairSecondRound(previous), points)
  }
  if (settings.players === PRECON_DEFAULT_PLAYERS && rounds.length === 2) {
    const grid = seatGrid(rounds[0]?.tables ?? [], rounds[1]?.tables ?? [])
    if (!grid) {
      throw new Error(
        'No se pudo armar la siguiente ronda sin repetir rivales.'
      )
    }
    return sortTablesByPoints(pairThirdRound(grid, points), points)
  }
  return sortTablesByPoints(pairFlexibleRound(rounds, settings, points), points)
}

export function totalPreconPoints(
  rounds: readonly PreconRound[],
  settings: PreconSettings = PRECON_DEFAULT_SETTINGS
): number[] {
  const points = Array.from({ length: settings.players }, () => 0)
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

function pairKey(left: number, right: number): string {
  return left < right ? `${left}-${right}` : `${right}-${left}`
}

function playedPairs(rounds: readonly PreconRound[]): Set<string> {
  const pairs = new Set<string>()
  for (const round of rounds) {
    for (const table of round.tables) {
      for (let left = 0; left < table.length; left += 1) {
        for (let right = left + 1; right < table.length; right += 1) {
          pairs.add(pairKey(table[left] ?? -1, table[right] ?? -1))
        }
      }
    }
  }
  return pairs
}

function assignmentCost(
  tables: readonly (readonly number[])[],
  played: ReadonlySet<string>,
  points: readonly number[]
): number {
  let repeats = 0
  let spread = 0
  for (const table of tables) {
    if (table.length === 0) continue
    const scored = table.map(player => points[player] ?? 0)
    spread += Math.max(...scored) - Math.min(...scored)
    for (let left = 0; left < table.length; left += 1) {
      for (let right = left + 1; right < table.length; right += 1) {
        if (played.has(pairKey(table[left] ?? -1, table[right] ?? -1))) {
          repeats += 1
        }
      }
    }
  }
  return repeats * 1000 + spread
}

function pairFlexibleRound(
  rounds: readonly PreconRound[],
  settings: PreconSettings,
  points: readonly number[]
): number[][] {
  const played = playedPairs(rounds)
  const tableCount = preconTableCount(settings)
  const order = Array.from({ length: settings.players }, (_, index) => index)
  order.sort(
    (left, right) => (points[right] ?? 0) - (points[left] ?? 0) || left - right
  )
  const tables: number[][] = Array.from({ length: tableCount }, () => [])
  let bestCost = Number.POSITIVE_INFINITY
  let best: number[][] | null = null
  let nodes = 0
  const limit = settings.players <= 12 ? 250_000 : 30_000

  const place = (index: number) => {
    if (nodes > limit) return
    nodes += 1
    if (index === order.length) {
      const cost = assignmentCost(tables, played, points)
      if (cost < bestCost) {
        bestCost = cost
        best = tables.map(table => [...table])
      }
      return
    }
    const player = order[index] ?? index
    for (let tableIndex = 0; tableIndex < tableCount; tableIndex += 1) {
      const table = tables[tableIndex]
      if (!table || table.length >= PRECON_TABLE_SIZE) continue
      if (
        table.length === 0 &&
        tableIndex > 0 &&
        (tables[tableIndex - 1]?.length ?? 0) === 0
      ) {
        continue
      }
      table.push(player)
      place(index + 1)
      table.pop()
      if (bestCost === 0) return
    }
  }

  place(0)
  if (best) return best

  for (const player of order) {
    let chosen = 0
    let chosenRepeats = Number.POSITIVE_INFINITY
    for (let tableIndex = 0; tableIndex < tableCount; tableIndex += 1) {
      const table = tables[tableIndex]
      if (!table || table.length >= PRECON_TABLE_SIZE) continue
      const repeats = table.filter(other =>
        played.has(pairKey(player, other))
      ).length
      if (repeats < chosenRepeats) {
        chosenRepeats = repeats
        chosen = tableIndex
      }
    }
    tables[chosen]?.push(player)
  }
  return tables
}

function pairSecondRound(round: PreconRound): number[][] {
  const columns: number[][] = Array.from(
    { length: PRECON_TABLE_SIZE },
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
  const grid: number[][] = Array.from({ length: PRECON_TABLE_SIZE }, () =>
    Array.from({ length: PRECON_TABLE_SIZE }, () => -1)
  )
  for (let player = 0; player < PRECON_DEFAULT_PLAYERS; player += 1) {
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
  const assignment: number[][] = Array.from({ length: PRECON_TABLE_SIZE }, () =>
    Array.from({ length: PRECON_TABLE_SIZE }, () => -1)
  )
  const rowUsed = Array.from({ length: PRECON_TABLE_SIZE }, () =>
    Array.from({ length: PRECON_TABLE_SIZE }, () => false)
  )
  const columnUsed = Array.from({ length: PRECON_TABLE_SIZE }, () =>
    Array.from({ length: PRECON_TABLE_SIZE }, () => false)
  )
  let bestKey = ''
  let bestTables: number[][][] = []

  const consider = () => {
    const tables: number[][] = Array.from(
      { length: PRECON_TABLE_SIZE },
      () => []
    )
    for (let row = 0; row < PRECON_TABLE_SIZE; row += 1) {
      for (let column = 0; column < PRECON_TABLE_SIZE; column += 1) {
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
    if (cell === PRECON_DEFAULT_PLAYERS) {
      consider()
      return
    }
    const row = Math.floor(cell / PRECON_TABLE_SIZE)
    const column = cell % PRECON_TABLE_SIZE
    for (let symbol = 0; symbol < PRECON_TABLE_SIZE; symbol += 1) {
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
