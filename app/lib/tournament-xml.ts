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

export type ParseTournamentXmlResult = {
  meta: ParsedTournamentMeta | null
  players: ParsedPlayer[]
  matches: ParsedMatch[]
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
    return { meta: null, players: [], matches: [] }
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return {
      meta: null,
      players: [],
      matches: [],
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
      error: 'XML inválido o mal formado.'
    }
  }

  const root = doc.documentElement
  if (!root || root.localName !== 'tournament') {
    return {
      meta: null,
      players: [],
      matches: [],
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
      const uid1 = p1?.getAttribute('userid')?.trim() ?? ''
      const uid2 = p2?.getAttribute('userid')?.trim() ?? ''
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

  return { meta, players, matches }
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
