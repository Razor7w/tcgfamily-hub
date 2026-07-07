import {
  parseParticipantMatchRoundsFromLean,
  trimOpponentDisplayName,
  type GameResultLetter,
  type ParticipantMatchRoundDTO
} from '@/lib/participant-match-round'
import { popidForStorage } from '@/lib/rut-chile'
import type { ParsedMatch } from '@/lib/tournament-xml'
import { formatPersonDisplayName } from '@/lib/weekly-events'

export type WltRecord = {
  wins: number
  losses: number
  ties: number
}

export type RoundSnapshotPairingLean = {
  tableNumber?: string
  player1PopId?: string
  player2PopId?: string
  player1Name?: string
  player2Name?: string
  player1Record?: { wins?: unknown; losses?: unknown; ties?: unknown }
  player2Record?: { wins?: unknown; losses?: unknown; ties?: unknown }
  isBye?: boolean
}

export type RoundSnapshotLean = {
  roundNum: number
  pairings?: RoundSnapshotPairingLean[]
}

function clampWlt(n: unknown): number {
  return Math.max(0, Math.min(999, Math.round(Number(n) || 0)))
}

function normalizeWlt(raw?: {
  wins?: unknown
  losses?: unknown
  ties?: unknown
}): WltRecord | null {
  if (!raw) return null
  return {
    wins: clampWlt(raw.wins),
    losses: clampWlt(raw.losses),
    ties: clampWlt(raw.ties)
  }
}

export function buildPopToDisplayNameMap(
  participants: { displayName?: string; popId?: string }[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of participants) {
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    const name =
      typeof p.displayName === 'string' && p.displayName.trim()
        ? formatPersonDisplayName(p.displayName)
        : ''
    if (pop && name) map.set(pop, name)
  }
  return map
}

function resolveOpponentNameFromPairing(
  pairing: RoundSnapshotPairingLean,
  myPop: string,
  popToDisplayName: Map<string, string>
): { name: string; isBye: boolean } | null {
  const p1 = popidForStorage(
    typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
  )
  const p2 = popidForStorage(
    typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
  )

  if (p1 === myPop) {
    if (pairing.isBye || !p2) return { name: 'Bye', isBye: true }
    const fromPairing =
      typeof pairing.player2Name === 'string' ? pairing.player2Name.trim() : ''
    if (fromPairing)
      return { name: formatPersonDisplayName(fromPairing), isBye: false }
    const fromPop = p2 ? popToDisplayName.get(p2) : undefined
    if (fromPop) return { name: fromPop, isBye: false }
    return p2 ? { name: p2, isBye: false } : null
  }

  if (p2 === myPop) {
    const fromPairing =
      typeof pairing.player1Name === 'string' ? pairing.player1Name.trim() : ''
    if (fromPairing)
      return { name: formatPersonDisplayName(fromPairing), isBye: false }
    const fromPop = p1 ? popToDisplayName.get(p1) : undefined
    if (fromPop) return { name: fromPop, isBye: false }
    return p1 ? { name: p1, isBye: false } : null
  }

  return null
}

/** POP del rival en una ronda (emparejamiento TDF), si existe. */
export function opponentPopFromSnapshotForRound(
  myPop: string,
  roundNum: number,
  snapshots: RoundSnapshotLean[]
): string | null {
  if (!myPop) return null
  const snap = snapshots.find(s => Math.round(Number(s.roundNum)) === roundNum)
  if (!snap) return null
  for (const pairing of snap.pairings ?? []) {
    const p1 = popidForStorage(
      typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
    )
    const p2 = popidForStorage(
      typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
    )
    if (p1 === myPop) {
      if (pairing.isBye || !p2) return null
      return p2
    }
    if (p2 === myPop) return p1 || null
  }
  return null
}

export function opponentFromSnapshotForRound(
  myPop: string,
  roundNum: number,
  snapshots: RoundSnapshotLean[],
  popToDisplayName: Map<string, string>
): { name: string; isBye: boolean } | null {
  if (!myPop) return null
  const snap = snapshots.find(s => Math.round(Number(s.roundNum)) === roundNum)
  if (!snap) return null
  for (const pairing of snap.pairings ?? []) {
    const hit = resolveOpponentNameFromPairing(pairing, myPop, popToDisplayName)
    if (hit) return hit
  }
  return null
}

export type ParticipantDeckLookup = {
  byPop: Map<string, string[]>
  byName: Map<string, string[]>
}

export function emptyParticipantDeckLookup(): ParticipantDeckLookup {
  return { byPop: new Map(), byName: new Map() }
}

function deckSlugsFromLean(p: { deckPokemonSlugs?: unknown }): string[] {
  if (!Array.isArray(p.deckPokemonSlugs)) return []
  return p.deckPokemonSlugs
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map(s => s.trim())
    .slice(0, 2)
}

/** Mazo que el propio jugador reportó en el torneo (sprites o listado vinculado). */
export function buildParticipantDeckLookup(
  participants: {
    displayName?: string
    popId?: string
    deckPokemonSlugs?: unknown
  }[]
): ParticipantDeckLookup {
  const byPop = new Map<string, string[]>()
  const byName = new Map<string, string[]>()
  for (const p of participants) {
    const slugs = deckSlugsFromLean(p)
    if (slugs.length === 0) continue
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (pop) byPop.set(pop, slugs)
    const rawName =
      typeof p.displayName === 'string' ? p.displayName.trim() : ''
    if (rawName) {
      byName.set(
        formatPersonDisplayName(rawName).toLocaleLowerCase('es'),
        slugs
      )
    }
  }
  return { byPop, byName }
}

function participantNameKey(displayName: string): string {
  return formatPersonDisplayName(displayName).toLocaleLowerCase('es')
}

/**
 * Sprites que otros jugadores asignaron en su bitácora a rivales que aún no reportaron mazo.
 * Si el rival reporta desde su cuenta, deja de usarse (solo cuenta `buildParticipantDeckLookup`).
 */
export function buildBitacoraInferredDeckLookup(
  participants: {
    displayName?: string
    popId?: string
    deckPokemonSlugs?: unknown
    matchRounds?: unknown
  }[]
): ParticipantDeckLookup {
  const selfReportedNames = new Set<string>()
  const selfReportedPops = new Set<string>()
  for (const p of participants) {
    if (deckSlugsFromLean(p).length === 0) continue
    const rawName =
      typeof p.displayName === 'string' ? p.displayName.trim() : ''
    if (rawName) selfReportedNames.add(participantNameKey(rawName))
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (pop) selfReportedPops.add(pop)
  }

  const byName = new Map<string, string[]>()
  for (const reporter of participants) {
    const rounds = parseParticipantMatchRoundsFromLean(reporter.matchRounds)
    for (const r of rounds) {
      const slugs = (r.opponentDeckSlugs ?? []).filter(
        s => typeof s === 'string' && s.trim().length > 0
      )
      if (slugs.length === 0) continue
      const oppName = trimOpponentDisplayName(r.opponentDisplayName)
      if (!oppName) continue
      const key = participantNameKey(oppName)
      if (selfReportedNames.has(key) || byName.has(key)) continue
      byName.set(key, slugs.slice(0, 2))
    }
  }

  const byPop = new Map<string, string[]>()
  for (const p of participants) {
    if (deckSlugsFromLean(p).length > 0) continue
    const rawName =
      typeof p.displayName === 'string' ? p.displayName.trim() : ''
    if (!rawName) continue
    const inferred = byName.get(participantNameKey(rawName))
    if (!inferred?.length) continue
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    if (pop && !selfReportedPops.has(pop)) byPop.set(pop, inferred)
  }

  return { byPop, byName }
}

/** Sprites del rival según lo que ese jugador reportó en el evento (POP o nombre). */
export function resolvePlatformOpponentDeckSlugsForRound(
  round: Pick<
    ParticipantMatchRoundDTO,
    'roundNum' | 'opponentDisplayName' | 'specialOutcome'
  >,
  myPop: string,
  snapshots: RoundSnapshotLean[],
  lookup: ParticipantDeckLookup
): string[] {
  if (round.specialOutcome === 'bye') return []
  let slugs: string[] | undefined
  if (myPop) {
    const oppPop = opponentPopFromSnapshotForRound(
      myPop,
      round.roundNum,
      snapshots
    )
    if (oppPop) slugs = lookup.byPop.get(oppPop)
  }
  const oppName = trimOpponentDisplayName(round.opponentDisplayName)
  if (!slugs?.length && oppName) {
    slugs = lookup.byName.get(
      formatPersonDisplayName(oppName).toLocaleLowerCase('es')
    )
  }
  return slugs?.length ? [...slugs] : []
}

function manualOpponentSlugs(r: ParticipantMatchRoundDTO): string[] {
  return (r.opponentDeckSlugs ?? []).filter(
    s => typeof s === 'string' && s.trim().length > 0
  )
}

/**
 * 1) Mazo que el rival reportó en el torneo (bloquea edición).
 * 2) Sprites que tú guardaste en esa ronda.
 * 3) Sprites que otro jugador asignó en bitácora si el rival aún no reportó.
 */
export function enrichMatchRoundsWithOpponentDecks(
  myPopId: string | null,
  rounds: ParticipantMatchRoundDTO[],
  snapshots: RoundSnapshotLean[],
  selfReportedLookup: ParticipantDeckLookup,
  bitacoraLookup?: ParticipantDeckLookup,
  exposeOpponentDecksToOthers = true
): ParticipantMatchRoundDTO[] {
  const myPop = popidForStorage(myPopId ?? '')
  return rounds.map(r => {
    if (r.specialOutcome === 'bye') {
      return { ...r, opponentDeckSlugs: [], opponentDeckFromPlatform: false }
    }

    const manual = manualOpponentSlugs(r)

    if (exposeOpponentDecksToOthers) {
      const selfReported = resolvePlatformOpponentDeckSlugsForRound(
        r,
        myPop,
        snapshots,
        selfReportedLookup
      )
      if (selfReported.length > 0) {
        return {
          ...r,
          opponentDeckSlugs: selfReported,
          opponentDeckFromPlatform: true
        }
      }

      if (manual.length > 0) {
        return {
          ...r,
          opponentDeckSlugs: manual,
          opponentDeckFromPlatform: false
        }
      }

      if (bitacoraLookup) {
        const inferred = resolvePlatformOpponentDeckSlugsForRound(
          r,
          myPop,
          snapshots,
          bitacoraLookup
        )
        if (inferred.length > 0) {
          return {
            ...r,
            opponentDeckSlugs: inferred,
            opponentDeckFromPlatform: false
          }
        }
      }

      return { ...r, opponentDeckSlugs: [], opponentDeckFromPlatform: false }
    }

    return {
      ...r,
      opponentDeckSlugs: manual,
      opponentDeckFromPlatform: false
    }
  })
}

/** Al guardar la bitácora: no persistir sprites manuales si el rival ya reportó mazo propio. */
export function stripManualOpponentDecksWhenPlatformReported(
  myPopId: string | null,
  rounds: ParticipantMatchRoundDTO[],
  snapshots: RoundSnapshotLean[],
  selfReportedLookup: ParticipantDeckLookup,
  exposeOpponentDecksToOthers = true
): ParticipantMatchRoundDTO[] {
  if (!exposeOpponentDecksToOthers) {
    return rounds.map(r => ({ ...r, opponentDeckFromPlatform: false }))
  }
  const myPop = popidForStorage(myPopId ?? '')
  return rounds.map(r => {
    const selfReported = resolvePlatformOpponentDeckSlugsForRound(
      r,
      myPop,
      snapshots,
      selfReportedLookup
    )
    if (selfReported.length > 0) {
      return { ...r, opponentDeckSlugs: [], opponentDeckFromPlatform: true }
    }
    return { ...r, opponentDeckFromPlatform: false }
  })
}

function recordAfterRoundFromSnapshots(
  pop: string,
  roundNum: number,
  snapshots: RoundSnapshotLean[],
  maxRound: number,
  finalRecordsByPop: Map<string, WltRecord>
): WltRecord | null {
  if (!pop) return null
  if (roundNum < maxRound) {
    return recordBeforeRoundFromSnapshots(pop, roundNum + 1, snapshots)
  }
  return finalRecordsByPop.get(pop) ?? null
}

/**
 * Reconstruye partidas suizo (outcomes 1/2/3 y bye) desde snapshots publicados en el evento.
 * Sirve para OWP/OOWP públicos cuando no hay TDF en el cliente.
 */
export function buildParsedMatchesFromRoundSnapshots(
  snapshots: RoundSnapshotLean[],
  finalRecordsByPop: Map<string, WltRecord>
): ParsedMatch[] {
  const sorted = [...snapshots].sort(
    (a, b) => Math.round(Number(a.roundNum)) - Math.round(Number(b.roundNum))
  )
  const roundNums = sorted
    .map(s => Math.round(Number(s.roundNum)))
    .filter(n => Number.isFinite(n) && n >= 1)
  const maxRound = roundNums.length > 0 ? Math.max(...roundNums) : 0
  const out: ParsedMatch[] = []

  for (const snap of sorted) {
    const roundNum = Math.round(Number(snap.roundNum))
    if (!Number.isFinite(roundNum) || roundNum < 1) continue

    for (const pairing of snap.pairings ?? []) {
      const p1 = popidForStorage(
        typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
      )
      const p2 = popidForStorage(
        typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
      )
      const isBye = Boolean(pairing.isBye) || Boolean(p1 && !p2)

      if (isBye) {
        if (p1) {
          out.push({
            roundNumber: roundNum,
            roundType: '',
            roundStage: '',
            outcome: '5',
            player1UserId: p1,
            player2UserId: '',
            timestamp: '',
            tableNumber:
              typeof pairing.tableNumber === 'string'
                ? pairing.tableNumber
                : '0'
          })
        }
        continue
      }

      if (!p1 || !p2) continue

      const before1 = normalizeWlt(pairing.player1Record)
      const before2 = normalizeWlt(pairing.player2Record)
      if (!before1 || !before2) continue

      const after1 = recordAfterRoundFromSnapshots(
        p1,
        roundNum,
        sorted,
        maxRound,
        finalRecordsByPop
      )
      const after2 = recordAfterRoundFromSnapshots(
        p2,
        roundNum,
        sorted,
        maxRound,
        finalRecordsByPop
      )
      if (!after1 || !after2) continue

      const r1 = inferRoundOutcomeFromRecordDelta(before1, after1)
      const r2 = inferRoundOutcomeFromRecordDelta(before2, after2)
      if (!r1?.gameResults[0] || !r2?.gameResults[0]) continue

      let outcome = ''
      if (r1.gameResults[0] === 'W' && r2.gameResults[0] === 'L') outcome = '1'
      else if (r1.gameResults[0] === 'L' && r2.gameResults[0] === 'W')
        outcome = '2'
      else if (r1.gameResults[0] === 'T' && r2.gameResults[0] === 'T')
        outcome = '3'
      else continue

      out.push({
        roundNumber: roundNum,
        roundType: '',
        roundStage: '',
        outcome,
        player1UserId: p1,
        player2UserId: p2,
        timestamp: '',
        tableNumber:
          typeof pairing.tableNumber === 'string' ? pairing.tableNumber : ''
      })
    }
  }

  return out
}

/** Récord W/L/T publicado en el emparejamiento **antes** de jugar esa ronda. */
export function recordBeforeRoundFromSnapshots(
  myPop: string,
  roundNum: number,
  snapshots: RoundSnapshotLean[]
): WltRecord | null {
  if (!myPop) return null
  const snap = snapshots.find(s => Math.round(Number(s.roundNum)) === roundNum)
  if (!snap) return null
  for (const pairing of snap.pairings ?? []) {
    const pop1 = popidForStorage(
      typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
    )
    const pop2 = popidForStorage(
      typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
    )
    if (pop1 === myPop) return normalizeWlt(pairing.player1Record)
    if (pop2 === myPop) return normalizeWlt(pairing.player2Record)
  }
  return null
}

function collectRoundNumsForPop(
  myPop: string,
  snapshots: RoundSnapshotLean[],
  rounds: ParticipantMatchRoundDTO[]
): number[] {
  const set = new Set<number>()
  for (const r of rounds) set.add(r.roundNum)
  for (const snap of snapshots) {
    const rn = Math.round(Number(snap.roundNum))
    if (!Number.isFinite(rn) || rn < 1) continue
    for (const pairing of snap.pairings ?? []) {
      const pop1 = popidForStorage(
        typeof pairing.player1PopId === 'string' ? pairing.player1PopId : ''
      )
      const pop2 = popidForStorage(
        typeof pairing.player2PopId === 'string' ? pairing.player2PopId : ''
      )
      if (pop1 === myPop || pop2 === myPop) {
        set.add(rn)
        break
      }
    }
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * Infiere W/L/T de la mesa comparando récord antes de la ronda R vs antes de R+1
 * (o récord final del TDF en la última ronda del jugador).
 */
export function inferRoundOutcomeFromRecordDelta(
  before: WltRecord,
  after: WltRecord
): { gameResults: GameResultLetter[]; specialOutcome: null } | null {
  const dw = after.wins - before.wins
  const dl = after.losses - before.losses
  const dt = after.ties - before.ties
  if (dw === 1 && dl === 0 && dt === 0) {
    return { gameResults: ['W'], specialOutcome: null }
  }
  if (dw === 0 && dl === 1 && dt === 0) {
    return { gameResults: ['L'], specialOutcome: null }
  }
  if (dw === 0 && dl === 0 && dt === 1) {
    return { gameResults: ['T'], specialOutcome: null }
  }
  return null
}

function applyInferredResultsToRounds(
  rounds: ParticipantMatchRoundDTO[],
  myPop: string,
  snapshots: RoundSnapshotLean[],
  finalRecord: WltRecord | null,
  overrideStoredWlt = false
): ParticipantMatchRoundDTO[] {
  if (!myPop || snapshots.length === 0) return rounds

  const roundNums = collectRoundNumsForPop(myPop, snapshots, rounds)
  const maxRound = roundNums.length > 0 ? Math.max(...roundNums) : 0

  return rounds.map(round => {
    if (round.specialOutcome === 'bye') {
      return {
        ...round,
        gameResults: [],
        specialOutcome: 'bye' as const
      }
    }

    const before = recordBeforeRoundFromSnapshots(
      myPop,
      round.roundNum,
      snapshots
    )
    let after: WltRecord | null = null
    if (before) {
      if (round.roundNum < maxRound) {
        after = recordBeforeRoundFromSnapshots(
          myPop,
          round.roundNum + 1,
          snapshots
        )
      } else if (finalRecord) {
        after = finalRecord
      }
    }

    if (before && after) {
      const inferred = inferRoundOutcomeFromRecordDelta(before, after)
      if (inferred && (overrideStoredWlt || round.gameResults.length === 0)) {
        return { ...round, ...inferred }
      }
    }

    if (!overrideStoredWlt) {
      if (round.specialOutcome) return round
      if (round.gameResults.length > 0) return round
    }

    return round
  })
}

export type MergeMatchRoundsWithSnapshotsOptions = {
  /** Torneo oficial cerrado: el W-L-T inferido del TDF reemplaza la bitácora manual. */
  overrideStoredWltWithSnapshots?: boolean
}

/** Ajusta W-L-T de rondas guardadas al récord TDF (torneos oficiales cerrados). */
export function reconcileOfficialClosedRoundsWithSnapshots(
  rounds: ParticipantMatchRoundDTO[],
  myPop: string,
  snapshots: RoundSnapshotLean[],
  finalRecord: WltRecord | null
): ParticipantMatchRoundDTO[] {
  return applyInferredResultsToRounds(
    rounds,
    myPop,
    snapshots,
    finalRecord,
    true
  )
}

/**
 * Combina rondas reportadas por el jugador con emparejamientos del TDF (`roundSnapshots`):
 * rellena nombre del rival, resultado inferido (W/L/T) y añade rondas publicadas.
 */
export function mergeParticipantMatchRoundsWithSnapshots(
  myPopId: string | null,
  reported: ParticipantMatchRoundDTO[],
  snapshots: RoundSnapshotLean[],
  popToDisplayName: Map<string, string>,
  finalRecord?: WltRecord | null,
  options?: MergeMatchRoundsWithSnapshotsOptions
): ParticipantMatchRoundDTO[] {
  const overrideStoredWlt = options?.overrideStoredWltWithSnapshots === true
  const myPop = popidForStorage(myPopId ?? '')
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => Math.round(Number(a.roundNum)) - Math.round(Number(b.roundNum))
  )

  const enriched = reported.map(r => {
    const existing = trimOpponentDisplayName(r.opponentDisplayName)
    const base = existing ? { ...r, opponentDisplayName: existing } : r
    if (!myPop) return base
    const fromSnap = opponentFromSnapshotForRound(
      myPop,
      r.roundNum,
      sortedSnapshots,
      popToDisplayName
    )
    if (!fromSnap) return base
    return {
      ...base,
      opponentDisplayName: fromSnap.name,
      opponentNameFromPlatform: true
    }
  })

  if (!myPop || sortedSnapshots.length === 0) {
    return applyInferredResultsToRounds(
      enriched.sort((a, b) => a.roundNum - b.roundNum),
      myPop,
      sortedSnapshots,
      finalRecord ?? null,
      overrideStoredWlt
    )
  }

  const seenRounds = new Set(enriched.map(r => r.roundNum))
  const fromTdf: ParticipantMatchRoundDTO[] = []

  for (const snap of sortedSnapshots) {
    const roundNum = Math.round(Number(snap.roundNum))
    if (
      !Number.isFinite(roundNum) ||
      roundNum < 1 ||
      seenRounds.has(roundNum)
    ) {
      continue
    }
    const fromSnap = opponentFromSnapshotForRound(
      myPop,
      roundNum,
      sortedSnapshots,
      popToDisplayName
    )
    if (!fromSnap) continue
    seenRounds.add(roundNum)
    fromTdf.push({
      roundNum,
      opponentDisplayName: fromSnap.name,
      opponentNameFromPlatform: true,
      opponentDeckSlugs: [],
      gameResults: [],
      turnOrders: [],
      specialOutcome: fromSnap.isBye ? 'bye' : null
    })
  }

  const merged = [...enriched, ...fromTdf].sort(
    (a, b) => a.roundNum - b.roundNum
  )
  return applyInferredResultsToRounds(
    merged,
    myPop,
    sortedSnapshots,
    finalRecord ?? null,
    overrideStoredWlt
  )
}

/** Rondas del TDF con rival identificado (no bye): permiten guardar sprites antes del cierre. */
export function roundNumsWithSnapshotOpponentName(
  myPop: string,
  snapshots: RoundSnapshotLean[],
  popToDisplayName: Map<string, string>
): Set<number> {
  const out = new Set<number>()
  if (!myPop || snapshots.length === 0) return out
  const sorted = [...snapshots].sort(
    (a, b) => Math.round(Number(a.roundNum)) - Math.round(Number(b.roundNum))
  )
  const seen = new Set<number>()
  for (const snap of snapshots) {
    const roundNum = Math.round(Number(snap.roundNum))
    if (!Number.isFinite(roundNum) || roundNum < 1 || seen.has(roundNum))
      continue
    seen.add(roundNum)
    const hit = opponentFromSnapshotForRound(
      myPop,
      roundNum,
      sorted,
      popToDisplayName
    )
    if (hit && !hit.isBye && hit.name.trim()) out.add(roundNum)
  }
  return out
}

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function roundPersistedFieldsEqual(
  a: ParticipantMatchRoundDTO,
  b: ParticipantMatchRoundDTO
): boolean {
  if (a.roundNum !== b.roundNum) return false
  if (
    trimOpponentDisplayName(a.opponentDisplayName) !==
    trimOpponentDisplayName(b.opponentDisplayName)
  ) {
    return false
  }
  if ((a.specialOutcome ?? null) !== (b.specialOutcome ?? null)) return false
  if (!sameStringArray(a.gameResults, b.gameResults)) return false
  if (!sameStringArray(a.turnOrders, b.turnOrders)) return false
  if (!sameStringArray(a.opponentDeckSlugs, b.opponentDeckSlugs)) return false
  return true
}

function roundBodyUnchangedExceptDeck(
  prev: ParticipantMatchRoundDTO,
  next: ParticipantMatchRoundDTO
): boolean {
  if (prev.roundNum !== next.roundNum) return false
  if (
    trimOpponentDisplayName(prev.opponentDisplayName) !==
    trimOpponentDisplayName(next.opponentDisplayName)
  ) {
    return false
  }
  if ((prev.specialOutcome ?? null) !== (next.specialOutcome ?? null))
    return false
  if (!sameStringArray(prev.gameResults, next.gameResults)) return false
  if (!sameStringArray(prev.turnOrders, next.turnOrders)) return false
  return true
}

/**
 * Torneo oficial aún no cerrado: solo actualizar sprites en rondas con rival del TDF.
 * Devuelve mensaje de error o null si el payload es válido.
 */
export function validateOfficialPreCloseSpriteSave(
  stored: ParticipantMatchRoundDTO[],
  incoming: ParticipantMatchRoundDTO[],
  eligibleRoundNums: Set<number>
): string | null {
  const storedMap = new Map(stored.map(r => [r.roundNum, r]))
  const incomingNums = new Set(incoming.map(r => r.roundNum))

  for (const prev of stored) {
    if (!incomingNums.has(prev.roundNum)) {
      return 'No puedes eliminar rondas antes de que el torneo finalice.'
    }
  }

  for (const next of incoming) {
    const prev = storedMap.get(next.roundNum)
    const eligible = eligibleRoundNums.has(next.roundNum)

    if (!eligible) {
      if (!prev) {
        return 'Solo puedes registrar rondas nuevas cuando el torneo esté finalizado.'
      }
      if (!roundPersistedFieldsEqual(prev, next)) {
        return 'Antes del cierre del torneo solo puedes editar sprites en mesas publicadas por la tienda.'
      }
      continue
    }

    if (!prev) {
      if (next.gameResults.length > 0 || next.turnOrders.length > 0) {
        return 'Antes del cierre solo puedes guardar los Pokémon del rival.'
      }
      if (next.specialOutcome) {
        return 'Antes del cierre solo puedes guardar los Pokémon del rival.'
      }
      if (!trimOpponentDisplayName(next.opponentDisplayName)) {
        return 'Falta el nombre del rival publicado por la tienda.'
      }
      continue
    }

    if (!roundBodyUnchangedExceptDeck(prev, next)) {
      return 'Antes del cierre solo puedes actualizar los sprites del rival en esta ronda.'
    }
  }

  for (const roundNum of incomingNums) {
    if (!storedMap.has(roundNum) && !eligibleRoundNums.has(roundNum)) {
      return 'Solo puedes registrar rondas nuevas cuando el torneo esté finalizado.'
    }
  }

  return null
}

/** Atajo para lean `matchRounds` + snapshots del evento. */
export function mergeLeanMatchRoundsWithSnapshots(
  myPopId: string | null,
  rawMatchRounds: unknown,
  snapshots: RoundSnapshotLean[],
  popToDisplayName: Map<string, string>,
  finalRecord?: WltRecord | null,
  options?: MergeMatchRoundsWithSnapshotsOptions
): ParticipantMatchRoundDTO[] {
  return mergeParticipantMatchRoundsWithSnapshots(
    myPopId,
    parseParticipantMatchRoundsFromLean(rawMatchRounds),
    snapshots,
    popToDisplayName,
    finalRecord,
    options
  )
}
