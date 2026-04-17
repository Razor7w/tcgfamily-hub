/**
 * Parser del XML de torneo (TRADING_CARD_GAME / modo custom).
 * Pensado para ejecutarse en el navegador (usa DOMParser).
 */

export type ParsedTournamentMeta = {
  name: string
  id: string
  city: string
  state: string
  country: string
  roundTime: string
  finalsRoundTime: string
  organizerPopId: string
  organizerName: string
  startDate: string
  gameType: string
  mode: string
  version: string
  tournamentType: string
  tournamentStage: string
}

export type ParsedPlayer = {
  /** POP ID del jugador (atributo `userid` en el XML). */
  popId: string
  firstName: string
  lastName: string
  birthdate: string
  starter: boolean
  creationDate: string
  lastModifiedDate: string
}

export type ParsedMatch = {
  roundNumber: number
  roundType: string
  roundStage: string
  outcome: string
  player1UserId: string
  player2UserId: string
  timestamp: string
  tableNumber: string
}

/** Fila en el standing de un pod (atributos `id` y `place` en &lt;player&gt;). */
export type ParsedStandingPlayer = {
  popId: string
  place: number
}

/** Un bloque &lt;pod&gt; dentro de &lt;standings&gt;. */
export type ParsedStandingsPod = {
  category: string
  type: string
  players: ParsedStandingPlayer[]
}

export type ParseTournamentXmlResult = {
  meta: ParsedTournamentMeta | null
  players: ParsedPlayer[]
  matches: ParsedMatch[]
  standings: ParsedStandingsPod[]
  error?: string
}

function childText(parent: Element | null | undefined, tag: string): string {
  if (!parent) return ''
  const el = parent.getElementsByTagName(tag)[0]
  return el?.textContent?.trim() ?? ''
}

function parseBoolean(s: string | undefined | null): boolean {
  return String(s).toLowerCase() === 'true'
}

/**
 * Devuelve jugadores y emparejamientos (pairings) desde el XML pegado.
 */
export function parseTournamentXml(xmlString: string): ParseTournamentXmlResult {
  const trimmed = xmlString.trim()
  if (!trimmed) {
    return { meta: null, players: [], matches: [], standings: [] }
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return {
      meta: null,
      players: [],
      matches: [],
      standings: [],
      error: 'DOMParser no está disponible en este entorno.'
    }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(trimmed, 'application/xml')
  const parserErr = doc.querySelector('parsererror')
  if (parserErr) {
    return {
      meta: null,
      players: [],
      matches: [],
      standings: [],
      error: 'XML inválido o mal formado.'
    }
  }

  const root = doc.documentElement
  if (!root || root.localName !== 'tournament') {
    return {
      meta: null,
      players: [],
      matches: [],
      standings: [],
      error: 'No se encontró un elemento raíz <tournament>.'
    }
  }

  const meta: ParsedTournamentMeta = {
    name: '',
    id: '',
    city: '',
    state: '',
    country: '',
    roundTime: '',
    finalsRoundTime: '',
    organizerPopId: '',
    organizerName: '',
    startDate: '',
    gameType: root.getAttribute('gametype') ?? '',
    mode: root.getAttribute('mode') ?? '',
    version: root.getAttribute('version') ?? '',
    tournamentType: root.getAttribute('type') ?? '',
    tournamentStage: root.getAttribute('stage') ?? ''
  }

  const dataEl = root.getElementsByTagName('data')[0]
  if (dataEl) {
    meta.name = childText(dataEl, 'name')
    meta.id = childText(dataEl, 'id')
    meta.city = childText(dataEl, 'city')
    meta.state = childText(dataEl, 'state')
    meta.country = childText(dataEl, 'country')
    meta.roundTime = childText(dataEl, 'roundtime')
    meta.finalsRoundTime = childText(dataEl, 'finalsroundtime')
    meta.startDate = childText(dataEl, 'startdate')
    const org = dataEl.getElementsByTagName('organizer')[0]
    if (org) {
      meta.organizerPopId = org.getAttribute('popid') ?? ''
      meta.organizerName = org.getAttribute('name') ?? ''
    }
  }

  const players: ParsedPlayer[] = []
  const playerNodes = root.getElementsByTagName('players')[0]
  if (playerNodes) {
    const list = playerNodes.getElementsByTagName('player')
    for (let i = 0; i < list.length; i++) {
      const el = list[i]
      const popId = el.getAttribute('userid')?.trim() ?? ''
      if (!popId) continue
      players.push({
        popId,
        firstName: childText(el, 'firstname'),
        lastName: childText(el, 'lastname'),
        birthdate: childText(el, 'birthdate'),
        starter: parseBoolean(childText(el, 'starter')),
        creationDate: childText(el, 'creationdate'),
        lastModifiedDate: childText(el, 'lastmodifieddate')
      })
    }
  }

  const matches: ParsedMatch[] = []
  const roundNodes = root.getElementsByTagName('round')
  for (let r = 0; r < roundNodes.length; r++) {
    const roundEl = roundNodes[r]
    const roundNumber = parseInt(roundEl.getAttribute('number') ?? '0', 10) || 0
    const roundType = roundEl.getAttribute('type') ?? ''
    const roundStage = roundEl.getAttribute('stage') ?? ''
    const matchNodes = roundEl.getElementsByTagName('match')
    for (let m = 0; m < matchNodes.length; m++) {
      const matchEl = matchNodes[m]
      const p1 = matchEl.getElementsByTagName('player1')[0]
      const p2 = matchEl.getElementsByTagName('player2')[0]
      let uid1 = p1?.getAttribute('userid')?.trim() ?? ''
      let uid2 = p2?.getAttribute('userid')?.trim() ?? ''
      if (!uid1 && !uid2) {
        const lone = matchEl.getElementsByTagName('player')[0]
        const u = lone?.getAttribute('userid')?.trim() ?? ''
        if (u) uid1 = u
      }
      matches.push({
        roundNumber,
        roundType,
        roundStage,
        outcome: matchEl.getAttribute('outcome') ?? '',
        player1UserId: uid1,
        player2UserId: uid2,
        timestamp: childText(matchEl, 'timestamp'),
        tableNumber: childText(matchEl, 'tablenumber')
      })
    }
  }

  const standings: ParsedStandingsPod[] = []
  const standingsEl = root.getElementsByTagName('standings')[0]
  if (standingsEl) {
    const podNodes = standingsEl.getElementsByTagName('pod')
    for (let i = 0; i < podNodes.length; i++) {
      const podEl = podNodes[i]
      const category = podEl.getAttribute('category') ?? ''
      const type = podEl.getAttribute('type') ?? ''
      const standingPlayers: ParsedStandingPlayer[] = []
      const stPlayerNodes = podEl.getElementsByTagName('player')
      for (let j = 0; j < stPlayerNodes.length; j++) {
        const pl = stPlayerNodes[j]
        const popId = pl.getAttribute('id')?.trim() ?? ''
        if (!popId) continue
        const place = parseInt(pl.getAttribute('place') ?? '0', 10) || 0
        standingPlayers.push({ popId, place })
      }
      standingPlayers.sort((a, b) => a.place - b.place)
      standings.push({ category, type, players: standingPlayers })
    }
  }

  return { meta, players, matches, standings }
}

/** Mapa POP ID → nombre para mostrar en pairings. */
export function buildPlayerNameLookup(players: ParsedPlayer[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of players) {
    const full = [p.firstName, p.lastName].filter(Boolean).join(' ').trim()
    map.set(p.popId, full || p.popId)
  }
  return map
}

export type MatchRecord = {
  wins: number
  losses: number
  ties: number
}

/**
 * Acumula victorias / derrotas / empates por POP a partir de `outcome` en cada partida.
 * - `1` → gana jugador 1, `2` → gana jugador 2, `3` → empate (ambos), bye (un solo jugador) → victoria para ese jugador.
 */
export function buildMatchRecordsFromMatches(matches: ParsedMatch[]): Map<string, MatchRecord> {
  const map = new Map<string, MatchRecord>()
  const bump = (id: string) => {
    if (!id) return
    let r = map.get(id)
    if (!r) {
      r = { wins: 0, losses: 0, ties: 0 }
      map.set(id, r)
    }
    return r
  }

  for (const m of matches) {
    const o = m.outcome.trim()
    let u1 = m.player1UserId.trim()
    let u2 = m.player2UserId.trim()
    if (u1 && !u2) {
      const rec = bump(u1)
      if (rec) rec.wins++
      continue
    }
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

/**
 * Mismo criterio que {@link buildMatchRecordsFromMatches}, pero solo con partidas
 * cuyo `roundNumber` es &lt;= `maxRoundNumberInclusive`. Con rondas 1-based y `maxRoundNumberInclusive === 0`,
 * no entra ninguna partida → mapa vacío (todo 0-0-0).
 */
export function buildMatchRecordsThroughRound(
  matches: ParsedMatch[],
  maxRoundNumberInclusive: number,
): Map<string, MatchRecord> {
  const filtered = matches.filter(
    (m) => m.roundNumber <= maxRoundNumberInclusive,
  )
  return buildMatchRecordsFromMatches(filtered)
}

/**
 * Récord W/L/T al publicar la ronda `roundNum`: acumulado **hasta el final de la ronda `roundNum - 1`**
 * (p. ej. ronda 1 → 0-0-0 para todos; ronda 2 → solo resultados ya jugados en ronda 1).
 */
export function buildParticipantRecordsForSyncRound(
  matches: ParsedMatch[],
  players: ParsedPlayer[],
  roundNum: number,
): { popId: string; wins: number; losses: number; ties: number }[] {
  const prefix = buildMatchRecordsThroughRound(
    matches,
    Math.max(0, roundNum - 1),
  )
  return players.map((p) => {
    const r = prefix.get(p.popId)
    return {
      popId: p.popId,
      wins: r?.wins ?? 0,
      losses: r?.losses ?? 0,
      ties: r?.ties ?? 0,
    }
  })
}

export function formatMatchRecordWlt(r: MatchRecord | undefined): string {
  if (!r) return '0-0-0'
  return `${r.wins}-${r.losses}-${r.ties}`
}

export type MatchRecordsBeforeRow = {
  p1: MatchRecord
  p2: MatchRecord
}

/**
 * Para cada partida, récord W/L/T de cada jugador **antes** de aplicar esa partida,
 * procesando en orden de `roundNumber` (y orden de aparición en el XML dentro de la misma ronda).
 */
export function buildRecordsBeforeEachMatch(matches: ParsedMatch[]): (
  | MatchRecordsBeforeRow
  | undefined
)[] {
  const n = matches.length
  const snapshots: (MatchRecordsBeforeRow | undefined)[] = new Array(n)
  const running = new Map<string, MatchRecord>()
  const getM = (id: string): MatchRecord => {
    let r = running.get(id)
    if (!r) {
      r = { wins: 0, losses: 0, ties: 0 }
      running.set(id, r)
    }
    return r
  }
  const cloneR = (r: MatchRecord): MatchRecord => ({
    wins: r.wins,
    losses: r.losses,
    ties: r.ties
  })

  const indices = matches.map((_, i) => i).sort((a, b) => {
    const ra = matches[a].roundNumber
    const rb = matches[b].roundNumber
    if (ra !== rb) return ra - rb
    return a - b
  })

  for (const idx of indices) {
    const m = matches[idx]
    const u1 = m.player1UserId.trim()
    const u2 = m.player2UserId.trim()
    const o = m.outcome.trim()

    if (u1) {
      snapshots[idx] = {
        p1: cloneR(getM(u1)),
        p2: u2 ? cloneR(getM(u2)) : { wins: 0, losses: 0, ties: 0 }
      }
    }

    if (u1 && !u2) {
      getM(u1).wins++
      continue
    }
    if (!u1 || !u2) continue

    if (o === '1') {
      getM(u1).wins++
      getM(u2).losses++
    } else if (o === '2') {
      getM(u2).wins++
      getM(u1).losses++
    } else if (o === '3') {
      getM(u1).ties++
      getM(u2).ties++
    }
  }

  return snapshots
}
