import { parseParticipantMatchRoundsFromLean } from '@/lib/participant-match-round'
import { popidForStorage } from '@/lib/rut-chile'
import type { TournamentStandingLean } from '@/lib/weekly-event-public'

export type LeanParticipantForPlayedCheck = {
  popId?: string
  matchRounds?: unknown
  wins?: unknown
  losses?: unknown
  ties?: unknown
  manualPlacement?: {
    categoryIndex?: number
    place?: number | null
    isDnf?: boolean
  }
}

export type LeanEventForPlayedPopIds = {
  tournamentStandings?: TournamentStandingLean[]
  roundSnapshots?: Array<{
    pairings?: Array<{
      player1PopId?: string
      player2PopId?: string
    }>
  }>
}

/** POP IDs que figuraron en el torneo (clasificación TDF o emparejamientos sincronizados). */
export function buildPlayedPopIdSet(
  doc: LeanEventForPlayedPopIds
): Set<string> {
  const set = new Set<string>()

  for (const cat of doc.tournamentStandings ?? []) {
    for (const row of cat.finished ?? []) {
      const n = popidForStorage(row.popId)
      if (n) set.add(n)
    }
    for (const row of cat.dnf ?? []) {
      const n = popidForStorage(row.popId)
      if (n) set.add(n)
    }
  }

  if (set.size === 0) {
    for (const snap of doc.roundSnapshots ?? []) {
      for (const pairing of snap.pairings ?? []) {
        for (const raw of [pairing.player1PopId, pairing.player2PopId]) {
          const n = popidForStorage(typeof raw === 'string' ? raw : '')
          if (n) set.add(n)
        }
      }
    }
  }

  return set
}

/** Si el participante jugó el torneo (clasificación TDF, snapshots o récord W/L/T). */
export function participantPlayedTournament(
  p: LeanParticipantForPlayedCheck,
  playedPopIds: Set<string>,
  tournamentOrigin: 'official' | 'custom'
): boolean {
  if (tournamentOrigin === 'custom') {
    const rounds = parseParticipantMatchRoundsFromLean(p.matchRounds)
    if (rounds.length > 0) return true
    if (
      p.manualPlacement &&
      typeof p.manualPlacement.categoryIndex === 'number'
    ) {
      return true
    }
    const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
    return Boolean(pop && playedPopIds.size > 0 && playedPopIds.has(pop))
  }

  const pop = popidForStorage(typeof p.popId === 'string' ? p.popId : '')
  if (pop && playedPopIds.has(pop)) return true

  if (playedPopIds.size === 0) {
    const w = Math.max(0, Math.round(Number(p.wins) || 0))
    const l = Math.max(0, Math.round(Number(p.losses) || 0))
    const t = Math.max(0, Math.round(Number(p.ties) || 0))
    return w + l + t > 0
  }

  return false
}
