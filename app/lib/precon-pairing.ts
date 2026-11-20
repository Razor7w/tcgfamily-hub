export const PRECON_TABLE_SIZE = 4
export const PRECON_SMALL_TABLE_SIZE = 3
export const PRECON_MAX_PLAYERS = 32
export const PRECON_DEFAULT_PLAYERS = 16
export const PRECON_DEFAULT_ROUNDS = 3

export type PreconSettings = {
  players: number
  rounds: number
  threes: number
  fours: number
}

export const PRECON_DEFAULT_SETTINGS: PreconSettings = {
  players: PRECON_DEFAULT_PLAYERS,
  rounds: PRECON_DEFAULT_ROUNDS,
  threes: 0,
  fours: PRECON_DEFAULT_PLAYERS / PRECON_TABLE_SIZE
}

/**
 * Mesas de 4 y, si el número no cierra, de 3.
 * Con 10 jugadores queda una de 4 y dos de 3.
 */
export function preconTableSizes(players: number): number[] {
  for (
    let fours = Math.floor(players / PRECON_TABLE_SIZE);
    fours >= 0;
    fours -= 1
  ) {
    const rest = players - fours * PRECON_TABLE_SIZE
    if (rest % PRECON_SMALL_TABLE_SIZE !== 0) continue
    return [
      ...Array.from({ length: fours }, () => PRECON_TABLE_SIZE),
      ...Array.from(
        { length: rest / PRECON_SMALL_TABLE_SIZE },
        () => PRECON_SMALL_TABLE_SIZE
      )
    ]
  }
  return []
}

export function preconSettingsSizes(settings: PreconSettings): number[] {
  if (
    Number.isInteger(settings.threes) &&
    Number.isInteger(settings.fours) &&
    settings.threes >= 0 &&
    settings.fours >= 0 &&
    settings.threes + settings.fours > 0
  ) {
    return preconSizesFromCounts(settings.threes, settings.fours)
  }
  return preconTableSizes(settings.players)
}

export function preconTableCount(settings: PreconSettings): number {
  return preconSettingsSizes(settings).length
}

export function preconTableLayoutLabel(players: number): string {
  const sizes = preconTableSizes(players)
  return preconLayoutLabelFromSizes(sizes)
}

export function preconLayoutLabelFromSizes(sizes: readonly number[]): string {
  const fours = sizes.filter(size => size === PRECON_TABLE_SIZE).length
  const threes = sizes.filter(size => size === PRECON_SMALL_TABLE_SIZE).length
  const parts: string[] = []
  if (fours > 0) {
    parts.push(`${fours} ${fours === 1 ? 'mesa' : 'mesas'} de 4`)
  }
  if (threes > 0) {
    parts.push(`${threes} ${threes === 1 ? 'mesa' : 'mesas'} de 3`)
  }
  return parts.join(' y ')
}

/** Mesas de 4 primero y después las de 3. */
export function preconSizesFromCounts(threes: number, fours: number): number[] {
  return [
    ...Array.from({ length: fours }, () => PRECON_TABLE_SIZE),
    ...Array.from({ length: threes }, () => PRECON_SMALL_TABLE_SIZE)
  ]
}

export function preconSeatPlanError(
  players: number,
  threes: number,
  fours: number
): string | null {
  if (
    !Number.isInteger(threes) ||
    threes < 0 ||
    !Number.isInteger(fours) ||
    fours < 0
  ) {
    return 'Indica cuántas mesas de 3 y de 4.'
  }
  if (threes + fours < 1) return 'Hace falta al menos una mesa.'
  const seated = threes * PRECON_SMALL_TABLE_SIZE + fours * PRECON_TABLE_SIZE
  if (seated !== players) {
    return `Esas mesas sientan a ${seated} jugadores y hay ${players}.`
  }
  return null
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

/** Sin mínimo. El tope evita un sorteo que deje de responder. */
export function normalizePreconPlayers(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return PRECON_DEFAULT_PLAYERS
  return Math.min(PRECON_MAX_PLAYERS, parsed)
}

export function normalizePreconSettings(value: unknown): PreconSettings {
  const record =
    value && typeof value === 'object' ? (value as Partial<PreconSettings>) : {}
  const rounds = clampInt(record.rounds, 1, 5, PRECON_DEFAULT_ROUNDS)
  const rawThrees = Number(record.threes)
  const rawFours = Number(record.fours)
  if (
    Number.isInteger(rawThrees) &&
    rawThrees >= 0 &&
    Number.isInteger(rawFours) &&
    rawFours >= 0 &&
    rawThrees + rawFours > 0
  ) {
    return {
      threes: rawThrees,
      fours: rawFours,
      players:
        rawThrees * PRECON_SMALL_TABLE_SIZE + rawFours * PRECON_TABLE_SIZE,
      rounds
    }
  }
  const players = normalizePreconPlayers(record.players)
  const sizes = preconTableSizes(players)
  return {
    players,
    rounds,
    threes: sizes.filter(seats => seats === PRECON_SMALL_TABLE_SIZE).length,
    fours: sizes.filter(seats => seats === PRECON_TABLE_SIZE).length
  }
}

export function preconSettingsError(input: {
  threes: number
  fours: number
  rounds: number
}): string | null {
  if (
    !Number.isInteger(input.threes) ||
    input.threes < 0 ||
    !Number.isInteger(input.fours) ||
    input.fours < 0
  ) {
    return 'Indica cuántas mesas de 3 y de 4.'
  }
  if (input.threes + input.fours < 1) return 'Elige al menos una mesa.'
  const players =
    input.threes * PRECON_SMALL_TABLE_SIZE + input.fours * PRECON_TABLE_SIZE
  if (players > PRECON_MAX_PLAYERS) {
    return `Esas mesas suman ${players} jugadores. El máximo es ${PRECON_MAX_PLAYERS}.`
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

function emptyPoints(seats: number): number[] {
  return Array.from({ length: seats }, () => 0)
}

export type PreconRound = {
  tables: number[][]
  results: PreconTableResult[]
}

export function emptyPreconResults(
  settings: PreconSettings = PRECON_DEFAULT_SETTINGS,
  sizes: readonly number[] = preconSettingsSizes(settings)
): PreconTableResult[] {
  return sizes.map(seats => ({
    points: emptyPoints(seats),
    finished: false
  }))
}

function seatPoints(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    (value.length !== PRECON_TABLE_SIZE &&
      value.length !== PRECON_SMALL_TABLE_SIZE)
  ) {
    return null
  }
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

export type PreconStandingRow = {
  playerIndex: number
  name: string
  points: number | null
  wins: number
  matches: number
  winRate: number | null
}

/**
 * El standing suma los puntos anotados en cada mesa.
 * El win rate es mesas ganadas sobre mesas terminadas.
 * Gana la mesa quien queda solo con el puntaje más alto.
 * Si empatan puntos y win rate, queda arriba quien jugó en la mesa más alta
 * de la última ronda. La primera ronda no cuenta: ahí las mesas salen al azar.
 * Si siguen empatados, el orden es el sorteo guardado, no el alfabético.
 */
export function preconStandings(
  rounds: readonly PreconRound[],
  names: readonly string[],
  tieOrder: readonly number[] = []
): PreconStandingRow[] {
  const rows = new Map<
    number,
    {
      points: number | null
      wins: number
      matches: number
      tables: number[]
    }
  >()

  const ensure = (playerIndex: number) => {
    const current = rows.get(playerIndex)
    if (current) return current
    const created = {
      points: null as number | null,
      wins: 0,
      matches: 0,
      tables: [] as number[]
    }
    rows.set(playerIndex, created)
    return created
  }

  rounds.forEach((round, roundIndex) => {
    round.tables.forEach((seats, tableIndex) => {
      for (const playerIndex of seats) {
        ensure(playerIndex).tables[roundIndex] = tableIndex
      }
      const result = round.results[tableIndex]
      if (!result || result.points.length !== seats.length) return
      const top = Math.max(...result.points)
      const leaders = result.points.filter(point => point === top).length
      seats.forEach((playerIndex, seat) => {
        const row = ensure(playerIndex)
        const scored = preconSeatPoints(result, seat)
        if (scored !== null) row.points = (row.points ?? 0) + scored
        if (!result.finished) return
        row.matches += 1
        if (leaders === 1 && result.points[seat] === top) row.wins += 1
      })
    })
  })

  return [...rows.entries()]
    .map(([playerIndex, row]) => ({
      playerIndex,
      name: names[playerIndex]?.trim() || 'Sin nombre',
      points: row.points,
      wins: row.wins,
      matches: row.matches,
      winRate: row.matches === 0 ? null : row.wins / row.matches,
      tables: row.tables
    }))
    .sort((left, right) => {
      if (left.points === null && right.points === null) {
        return (
          comparePreconTableRank(left.tables, right.tables) ||
          comparePreconTieOrder(left.playerIndex, right.playerIndex, tieOrder)
        )
      }
      if (left.points === null) return 1
      if (right.points === null) return -1
      if (right.points !== left.points) return right.points - left.points
      const leftRate = left.winRate ?? 0
      const rightRate = right.winRate ?? 0
      if (rightRate !== leftRate) return rightRate - leftRate
      return (
        comparePreconTableRank(left.tables, right.tables) ||
        comparePreconTieOrder(left.playerIndex, right.playerIndex, tieOrder)
      )
    })
    .map(row => ({
      playerIndex: row.playerIndex,
      name: row.name,
      points: row.points,
      wins: row.wins,
      matches: row.matches,
      winRate: row.winRate
    }))
}

/** Mesa 1 es la más alta. Se mira la última ronda y, si sigue el empate, la anterior. */
function comparePreconTableRank(
  leftTables: readonly number[],
  rightTables: readonly number[]
): number {
  const last = Math.max(leftTables.length, rightTables.length) - 1
  for (let roundIndex = last; roundIndex >= 1; roundIndex -= 1) {
    const leftTable = leftTables[roundIndex] ?? Number.POSITIVE_INFINITY
    const rightTable = rightTables[roundIndex] ?? Number.POSITIVE_INFINITY
    if (leftTable !== rightTable) return leftTable - rightTable
  }
  return 0
}

function comparePreconTieOrder(
  leftPlayer: number,
  rightPlayer: number,
  tieOrder: readonly number[]
): number {
  const leftRank = tieOrder.indexOf(leftPlayer)
  const rightRank = tieOrder.indexOf(rightPlayer)
  const left = leftRank === -1 ? leftPlayer : leftRank
  const right = rightRank === -1 ? rightPlayer : rightRank
  return left - right
}

/** Orden estable para desempatar el standing sin usar el nombre. */
export function preconTieOrder(count: number): number[] {
  const order = Array.from({ length: count }, (_, index) => index)
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1)
    const current = order[index]
    order[index] = order[swap] ?? swap
    order[swap] = current ?? index
  }
  return order
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
 * Primera ronda: se mezclan los jugadores y se sientan en mesas de 4 y de 3.
 * Cada mesa es una lista de índices de jugador.
 */
export function pairPreconFirstRound(
  names: readonly string[],
  settings: PreconSettings = PRECON_DEFAULT_SETTINGS,
  sizes: readonly number[] = preconSettingsSizes(settings)
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

  const tables: number[][] = []
  let cursor = 0
  if (
    sizes.reduce((sum, seats) => sum + seats, 0) !== settings.players ||
    sizes.some(
      seats => seats !== PRECON_TABLE_SIZE && seats !== PRECON_SMALL_TABLE_SIZE
    )
  ) {
    throw new Error('Las mesas tienen que ser de 3 o de 4 y cubrir a todos.')
  }

  for (const seats of sizes) {
    tables.push(order.slice(cursor, cursor + seats))
    cursor += seats
  }
  return tables
}

/**
 * Desde la segunda ronda, la mesa de 4 va primero si hay una.
 * La mesa 1 sienta a los de más puntos. Las demás salen al azar,
 * evitando rivales que ya compartieron mesa.
 */
export function pairPreconNextRound(
  rounds: readonly PreconRound[],
  settings: PreconSettings = PRECON_DEFAULT_SETTINGS,
  sizes: readonly number[] = preconSettingsSizes(settings),
  names: readonly string[] = [],
  tieOrder: readonly number[] = []
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
  if (
    sizes.reduce((sum, seats) => sum + seats, 0) !== settings.players ||
    sizes.some(
      seats => seats !== PRECON_TABLE_SIZE && seats !== PRECON_SMALL_TABLE_SIZE
    )
  ) {
    throw new Error('Las mesas tienen que ser de 3 o de 4 y cubrir a todos.')
  }

  const orderedSizes = [
    ...sizes.filter(seats => seats === PRECON_TABLE_SIZE),
    ...sizes.filter(seats => seats === PRECON_SMALL_TABLE_SIZE)
  ]
  const ranked = preconStandings(
    rounds,
    Array.from({ length: settings.players }, (_, index) => names[index] ?? ''),
    tieOrder
  ).map(row => row.playerIndex)
  const seen = new Set(ranked)
  for (let index = 0; index < settings.players; index += 1) {
    if (!seen.has(index)) ranked.push(index)
  }

  const firstSize = orderedSizes[0] ?? 0
  const top = ranked.slice(0, firstSize)
  const rest = seatPreconRest(
    ranked.slice(firstSize),
    orderedSizes.slice(1),
    playedPreconPairs(rounds)
  )
  return [top, ...rest]
}

function preconPairKey(left: number, right: number): string {
  return left < right ? `${left}-${right}` : `${right}-${left}`
}

function playedPreconPairs(rounds: readonly PreconRound[]): Set<string> {
  const pairs = new Set<string>()
  for (const round of rounds) {
    for (const table of round.tables) {
      for (let left = 0; left < table.length; left += 1) {
        for (let right = left + 1; right < table.length; right += 1) {
          pairs.add(preconPairKey(table[left] ?? -1, table[right] ?? -1))
        }
      }
    }
  }
  return pairs
}

function preconRepeatScore(
  tables: readonly (readonly number[])[],
  played: ReadonlySet<string>
): number {
  let score = 0
  for (const table of tables) {
    for (let left = 0; left < table.length; left += 1) {
      for (let right = left + 1; right < table.length; right += 1) {
        if (played.has(preconPairKey(table[left] ?? -1, table[right] ?? -1))) {
          score += 1
        }
      }
    }
  }
  return score
}

function shufflePreconPlayers(players: readonly number[]): number[] {
  const order = [...players]
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1)
    const current = order[index]
    order[index] = order[swap] ?? swap
    order[swap] = current ?? index
  }
  return order
}

function chunkPreconPlayers(
  players: readonly number[],
  sizes: readonly number[]
): number[][] {
  const tables: number[][] = []
  let cursor = 0
  for (const seats of sizes) {
    tables.push(players.slice(cursor, cursor + seats))
    cursor += seats
  }
  return tables
}

function greedyPreconRest(
  players: readonly number[],
  sizes: readonly number[],
  played: ReadonlySet<string>
): number[][] {
  const tables = sizes.map(() => [] as number[])
  for (const player of shufflePreconPlayers(players)) {
    let bestRepeats = Number.POSITIVE_INFINITY
    const options: number[] = []
    tables.forEach((table, tableIndex) => {
      if (table.length >= (sizes[tableIndex] ?? 0)) return
      const repeats = table.filter(other =>
        played.has(preconPairKey(player, other))
      ).length
      if (repeats < bestRepeats) {
        bestRepeats = repeats
        options.length = 0
        options.push(tableIndex)
      } else if (repeats === bestRepeats) {
        options.push(tableIndex)
      }
    })
    const choice = options[randomInt(options.length)] ?? 0
    tables[choice]?.push(player)
  }
  return tables
}

function preconPartitionsExceed(sizes: readonly number[]): boolean {
  const limit = 20_000
  let left = sizes.reduce((sum, seats) => sum + seats, 0)
  let ways = 1
  const groups = new Map<number, number>()
  for (const seats of sizes) {
    let choices = 1
    for (let pick = 0; pick < seats; pick += 1) {
      choices *= left - pick
      choices /= pick + 1
      if (ways * choices > limit) return true
    }
    ways *= choices
    left -= seats
    groups.set(seats, (groups.get(seats) ?? 0) + 1)
    if (ways > limit) return true
  }
  for (const count of groups.values()) {
    let factorial = 1
    for (let value = 2; value <= count; value += 1) factorial *= value
    ways /= factorial
  }
  return ways > limit
}

function seatPreconRest(
  players: readonly number[],
  sizes: readonly number[],
  played: ReadonlySet<string>
): number[][] {
  if (sizes.length === 0 || players.length === 0) return []
  const pool: { score: number; seen: number; tables: number[][][] } = {
    score: Number.POSITIVE_INFINITY,
    seen: 0,
    tables: []
  }
  const consider = (tables: readonly (readonly number[])[]) => {
    const score = preconRepeatScore(tables, played)
    if (score > pool.score) return
    const copy = tables.map(table => [...table])
    if (score < pool.score) {
      pool.score = score
      pool.seen = 1
      pool.tables = [copy]
      return
    }
    pool.seen += 1
    if (pool.tables.length < 48) {
      pool.tables.push(copy)
      return
    }
    const slot = randomInt(pool.seen)
    if (slot < pool.tables.length) pool.tables[slot] = copy
  }

  if (!preconPartitionsExceed(sizes)) {
    const used = new Array<boolean>(players.length).fill(false)
    const chosen: number[][] = []
    const walk = (tableIndex: number) => {
      if (tableIndex === sizes.length) {
        consider(chosen)
        return
      }
      const seats = sizes[tableIndex] ?? 0
      let floor = -1
      for (let earlier = tableIndex - 1; earlier >= 0; earlier -= 1) {
        if (sizes[earlier] !== seats) continue
        floor = players.indexOf(chosen[earlier]?.[0] ?? -1)
        break
      }
      const picked: number[] = []
      const take = (start: number) => {
        if (picked.length === seats) {
          chosen.push(picked.map(index => players[index] ?? index))
          walk(tableIndex + 1)
          chosen.pop()
          return
        }
        for (let index = start; index < players.length; index += 1) {
          if (used[index]) continue
          if (picked.length === 0 && index <= floor) continue
          used[index] = true
          picked.push(index)
          take(index + 1)
          picked.pop()
          used[index] = false
        }
      }
      take(0)
    }
    walk(0)
  } else {
    for (let attempt = 0; attempt < 2500; attempt += 1) {
      consider(chunkPreconPlayers(shufflePreconPlayers(players), sizes))
    }
    for (let attempt = 0; attempt < 2500; attempt += 1) {
      consider(greedyPreconRest(players, sizes, played))
    }
  }

  return (
    pool.tables[randomInt(Math.max(pool.tables.length, 1))] ??
    chunkPreconPlayers(shufflePreconPlayers(players), sizes)
  )
}
