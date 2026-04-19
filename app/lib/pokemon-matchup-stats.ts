import {
  parseParticipantMatchRoundsFromLean,
  roundTableOutcome
} from '@/lib/participant-match-round'

export type TournamentOriginFilter = 'all' | 'official' | 'custom'

export type OpponentMatchupRowDTO = {
  opponentKey: string
  opponentSlugs: string[]
  wins: number
  losses: number
  ties: number
  neutral: number
  roundsPlayed: number
  lastPlayedAt: string
}

/** Clave estable para agrupar el deck rival (slugs únicos ordenados). */
export function opponentDeckKey(slugs: string[]): string {
  const u = [
    ...new Set(slugs.map(s => s.trim().toLowerCase()).filter(s => s.length > 0))
  ].sort()
  return u.join('|') || '__empty__'
}

/**
 * Orden de slugs para **mostrar** el mismo mazo que `deckKey` (clave ordenada).
 * Respeta el orden en que el usuario guardó los Pokémon en `rawSlugs` (p. ej. deck de perfil).
 */
export function slugsDisplayOrderForDeckKey(
  deckKey: string,
  rawSlugs: string[]
): string[] {
  if (deckKey === '__empty__') return []
  const keyParts = deckKey.split('|')
  const keySet = new Set(keyParts)
  const ordered: string[] = []
  const used = new Set<string>()
  for (const s of rawSlugs) {
    const low = s.trim().toLowerCase()
    if (!keySet.has(low) || used.has(low)) continue
    used.add(low)
    ordered.push(low)
  }
  for (const k of keyParts) {
    if (!used.has(k)) ordered.push(k)
  }
  return ordered
}

type LeanParticipant = {
  userId?: unknown
  matchRounds?: unknown
  deckPokemonSlugs?: unknown
}

type LeanEventForMatchups = {
  _id?: unknown
  startsAt: Date | string
  tournamentOrigin?: string
  participants?: LeanParticipant[]
}

function myDeckSlugsFromParticipant(p: LeanParticipant): string[] {
  const raw = p.deckPokemonSlugs
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  )
}

export type MyDeckStatsRowDTO = {
  myDeckKey: string
  myDeckSlugs: string[]
  wins: number
  losses: number
  ties: number
  neutral: number
  roundsPlayed: number
  lastPlayedAt: string
  tournamentsWithDeck: number
}

/** Agrupa todas las mesas reportadas por la combinación de Pokémon de TU deck (perfil del torneo). */
/**
 * Orden de slugs del mazo del usuario para mostrar, tomando el torneo **más reciente**
 * (`startsAt`) donde participó con esa clave de mazo.
 */
export function myDeckSlugsDisplayOrderFromEvents(
  events: LeanEventForMatchups[],
  userIdStr: string,
  deckKey: string
): string[] {
  if (deckKey === '__empty__') return []
  let bestT = -1
  let bestRaw: string[] = []
  for (const ev of events) {
    const parts = ev.participants ?? []
    const mine = parts.find(
      p => p?.userId != null && String(p.userId) === userIdStr
    ) as LeanParticipant | undefined
    if (!mine) continue
    const raw = myDeckSlugsFromParticipant(mine)
    if (opponentDeckKey(raw) !== deckKey) continue
    const startsAtRaw = ev.startsAt
    const startsAt =
      startsAtRaw instanceof Date
        ? startsAtRaw
        : new Date(
            typeof startsAtRaw === 'string' ? startsAtRaw : String(startsAtRaw)
          )
    const t = startsAt.getTime()
    if (t >= bestT) {
      bestT = t
      bestRaw = raw
    }
  }
  if (bestRaw.length === 0) return deckKey.split('|')
  return slugsDisplayOrderForDeckKey(deckKey, bestRaw)
}

export function aggregateMyDeckStats(
  events: LeanEventForMatchups[],
  userIdStr: string,
  origin: TournamentOriginFilter
): MyDeckStatsRowDTO[] {
  const map = new Map<
    string,
    {
      wins: number
      losses: number
      ties: number
      neutral: number
      roundsPlayed: number
      lastPlayedAt: Date
      tournamentIds: Set<string>
      displaySlugs: string[]
      displaySourceTime: number
    }
  >()

  for (const ev of events) {
    const tor = ev.tournamentOrigin === 'custom' ? 'custom' : 'official'
    if (origin === 'official' && tor !== 'official') continue
    if (origin === 'custom' && tor !== 'custom') continue

    const parts = ev.participants ?? []
    const mine = parts.find(
      p => p?.userId != null && String(p.userId) === userIdStr
    ) as LeanParticipant | undefined
    if (!mine) continue

    const rounds = parseParticipantMatchRoundsFromLean(mine.matchRounds)
    if (rounds.length === 0) continue

    const rawSlugs = myDeckSlugsFromParticipant(mine)
    const myKey = opponentDeckKey(rawSlugs)

    const startsAtRaw = ev.startsAt
    const startsAt =
      startsAtRaw instanceof Date
        ? startsAtRaw
        : new Date(
            typeof startsAtRaw === 'string' ? startsAtRaw : String(startsAtRaw)
          )

    const eventIdStr = ev._id != null ? String(ev._id) : ''

    let cur = map.get(myKey)
    if (!cur) {
      cur = {
        wins: 0,
        losses: 0,
        ties: 0,
        neutral: 0,
        roundsPlayed: 0,
        lastPlayedAt: startsAt,
        tournamentIds: new Set(),
        displaySlugs: [],
        displaySourceTime: -1
      }
      map.set(myKey, cur)
    }
    if (eventIdStr) cur.tournamentIds.add(eventIdStr)

    const t = startsAt.getTime()
    if (t >= cur.displaySourceTime) {
      cur.displaySourceTime = t
      cur.displaySlugs = slugsDisplayOrderForDeckKey(myKey, rawSlugs)
    }

    for (const r of rounds) {
      const outcome = roundTableOutcome(r)
      cur.roundsPlayed++
      if (outcome === 'win') cur.wins++
      else if (outcome === 'loss') cur.losses++
      else if (outcome === 'tie') cur.ties++
      else cur.neutral++
      if (startsAt.getTime() > cur.lastPlayedAt.getTime()) {
        cur.lastPlayedAt = startsAt
      }
    }
  }

  const rows: MyDeckStatsRowDTO[] = []
  for (const [myDeckKey, v] of map) {
    const myDeckSlugs =
      myDeckKey === '__empty__'
        ? []
        : v.displaySlugs.length > 0
          ? v.displaySlugs
          : myDeckKey.split('|')
    rows.push({
      myDeckKey,
      myDeckSlugs,
      wins: v.wins,
      losses: v.losses,
      ties: v.ties,
      neutral: v.neutral,
      roundsPlayed: v.roundsPlayed,
      lastPlayedAt: v.lastPlayedAt.toISOString(),
      tournamentsWithDeck: v.tournamentIds.size
    })
  }

  rows.sort(
    (a, b) =>
      new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
  )
  return rows
}

/** Rivales agrupados solo para mesas jugadas con un mazo tuyo concreto (`myDeckKey`). */
export function aggregateOpponentMatchupsForMyDeck(
  events: LeanEventForMatchups[],
  userIdStr: string,
  origin: TournamentOriginFilter,
  myDeckKeyFilter: string
): OpponentMatchupRowDTO[] {
  const map = new Map<
    string,
    {
      wins: number
      losses: number
      ties: number
      neutral: number
      roundsPlayed: number
      lastPlayedAt: Date
    }
  >()

  for (const ev of events) {
    const tor = ev.tournamentOrigin === 'custom' ? 'custom' : 'official'
    if (origin === 'official' && tor !== 'official') continue
    if (origin === 'custom' && tor !== 'custom') continue

    const parts = ev.participants ?? []
    const mine = parts.find(
      p => p?.userId != null && String(p.userId) === userIdStr
    ) as LeanParticipant | undefined
    if (!mine) continue

    const myKey = opponentDeckKey(myDeckSlugsFromParticipant(mine))
    if (myKey !== myDeckKeyFilter) continue

    const rounds = parseParticipantMatchRoundsFromLean(mine.matchRounds)
    if (rounds.length === 0) continue

    const startsAtRaw = ev.startsAt
    const startsAt =
      startsAtRaw instanceof Date
        ? startsAtRaw
        : new Date(
            typeof startsAtRaw === 'string' ? startsAtRaw : String(startsAtRaw)
          )

    for (const r of rounds) {
      const key = opponentDeckKey(r.opponentDeckSlugs ?? [])
      const outcome = roundTableOutcome(r)
      let cur = map.get(key)
      if (!cur) {
        cur = {
          wins: 0,
          losses: 0,
          ties: 0,
          neutral: 0,
          roundsPlayed: 0,
          lastPlayedAt: startsAt
        }
        map.set(key, cur)
      }
      cur.roundsPlayed++
      if (outcome === 'win') cur.wins++
      else if (outcome === 'loss') cur.losses++
      else if (outcome === 'tie') cur.ties++
      else cur.neutral++
      if (startsAt.getTime() > cur.lastPlayedAt.getTime()) {
        cur.lastPlayedAt = startsAt
      }
    }
  }

  const rows: OpponentMatchupRowDTO[] = []
  for (const [opponentKey, v] of map) {
    const opponentSlugs =
      opponentKey === '__empty__' ? [] : opponentKey.split('|')
    rows.push({
      opponentKey,
      opponentSlugs,
      wins: v.wins,
      losses: v.losses,
      ties: v.ties,
      neutral: v.neutral,
      roundsPlayed: v.roundsPlayed,
      lastPlayedAt: v.lastPlayedAt.toISOString()
    })
  }

  rows.sort(
    (a, b) =>
      new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
  )
  return rows
}

export function aggregateOpponentMatchups(
  events: LeanEventForMatchups[],
  userIdStr: string,
  origin: TournamentOriginFilter
): OpponentMatchupRowDTO[] {
  const map = new Map<
    string,
    {
      wins: number
      losses: number
      ties: number
      neutral: number
      roundsPlayed: number
      lastPlayedAt: Date
    }
  >()

  for (const ev of events) {
    const tor = ev.tournamentOrigin === 'custom' ? 'custom' : 'official'
    if (origin === 'official' && tor !== 'official') continue
    if (origin === 'custom' && tor !== 'custom') continue

    const parts = ev.participants ?? []
    const mine = parts.find(
      p => p?.userId != null && String(p.userId) === userIdStr
    )
    if (!mine) continue

    const rounds = parseParticipantMatchRoundsFromLean(mine.matchRounds)
    if (rounds.length === 0) continue

    const startsAtRaw = ev.startsAt
    const startsAt =
      startsAtRaw instanceof Date
        ? startsAtRaw
        : new Date(
            typeof startsAtRaw === 'string' ? startsAtRaw : String(startsAtRaw)
          )

    for (const r of rounds) {
      const key = opponentDeckKey(r.opponentDeckSlugs ?? [])
      const outcome = roundTableOutcome(r)
      let cur = map.get(key)
      if (!cur) {
        cur = {
          wins: 0,
          losses: 0,
          ties: 0,
          neutral: 0,
          roundsPlayed: 0,
          lastPlayedAt: startsAt
        }
        map.set(key, cur)
      }
      cur.roundsPlayed++
      if (outcome === 'win') cur.wins++
      else if (outcome === 'loss') cur.losses++
      else if (outcome === 'tie') cur.ties++
      else cur.neutral++
      if (startsAt.getTime() > cur.lastPlayedAt.getTime()) {
        cur.lastPlayedAt = startsAt
      }
    }
  }

  const rows: OpponentMatchupRowDTO[] = []
  for (const [opponentKey, v] of map) {
    const opponentSlugs =
      opponentKey === '__empty__' ? [] : opponentKey.split('|')
    rows.push({
      opponentKey,
      opponentSlugs,
      wins: v.wins,
      losses: v.losses,
      ties: v.ties,
      neutral: v.neutral,
      roundsPlayed: v.roundsPlayed,
      lastPlayedAt: v.lastPlayedAt.toISOString()
    })
  }

  rows.sort(
    (a, b) =>
      new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
  )
  return rows
}

export function winRatePercent(
  wins: number,
  losses: number,
  ties: number
): number | null {
  const d = wins + losses + ties
  if (d <= 0) return null
  return (wins / d) * 100
}
