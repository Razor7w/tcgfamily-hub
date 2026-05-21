import mongoose from 'mongoose'
import Store from '@/models/Store'
import { getTournamentDecklistDisplayLabels } from '@/lib/tournament-decklist-display'
import {
  matchRecordFromRounds,
  parseParticipantMatchRoundsFromLean,
  type ParticipantMatchRoundDTO
} from '@/lib/participant-match-round'
import {
  buildBitacoraInferredDeckLookup,
  buildParticipantDeckLookup,
  buildPopToDisplayNameMap,
  emptyParticipantDeckLookup,
  enrichMatchRoundsWithOpponentDecks,
  mergeParticipantMatchRoundsWithSnapshots,
  type RoundSnapshotLean
} from '@/lib/match-rounds-with-snapshots'
import { popidForStorage } from '@/lib/rut-chile'
import {
  canExposeParticipantDecksToOthers,
  formatPersonDisplayName
} from '@/lib/weekly-events'
import type { TournamentStandingLean } from '@/lib/weekly-event-public'
import {
  aggregateTournamentMetagame,
  type TournamentMetagameRowDTO
} from '@/lib/tournament-metagame'
import {
  buildPopStandingSortMap,
  buildParticipantStandingLookup,
  buildTournamentStandingsMeta,
  compareParticipantsByStanding,
  lookupParticipantStanding,
  type TournamentStandingsMetaDTO
} from '@/lib/tournament-standings-meta'

type LeanParticipant = {
  displayName?: string
  userId?: unknown
  popId?: string
  deckPokemonSlugs?: string[]
  matchRounds?: unknown
  wins?: unknown
  losses?: unknown
  ties?: unknown
  manualPlacement?: {
    categoryIndex?: number
    place?: number | null
    isDnf?: boolean
  }
  tournamentDecklistRef?: {
    decklistId?: unknown
    listKind?: string
    variantId?: unknown
  }
}

type LeanRoundSnapshot = RoundSnapshotLean

type LeanEvent = {
  _id: unknown
  storeId?: unknown
  startsAt: Date
  title: string
  kind: string
  game: string
  state?: string
  tournamentOrigin?: string
  tournamentStandings?: TournamentStandingLean[]
  roundSnapshots?: LeanRoundSnapshot[]
  participants?: LeanParticipant[]
}

export type TournamentMetaStoreDTO = {
  name: string
  slug: string
  logoUrl: string
}

export type TournamentMetaParticipantDTO = {
  participantKey: string
  userId: string | null
  popId: string | null
  displayName: string
  deckPokemonSlugs: string[]
  decklistDisplay: { decklistName: string; listLabel: string } | null
  hasDecklist: boolean
  matchRounds: ParticipantMatchRoundDTO[]
  matchRecord: { wins: number; losses: number; ties: number } | null
  standingPlace: number | null
  standingIsDnf: boolean
}

export type TournamentMetaPayload = {
  event: {
    _id: string
    title: string
    startsAt: string
    kind: string
    game: string
    state: string
    tournamentOrigin: 'official' | 'custom'
  }
  store: TournamentMetaStoreDTO | null
  participants: TournamentMetaParticipantDTO[]
  metagame: TournamentMetagameRowDTO[]
  standings: TournamentStandingsMetaDTO
}

export type { TournamentMetagameRowDTO, TournamentStandingsMetaDTO }

function participantKeyFromLean(p: LeanParticipant): string {
  if (p.userId && mongoose.Types.ObjectId.isValid(String(p.userId))) {
    return String(p.userId)
  }
  const name =
    typeof p.displayName === 'string' ? p.displayName.trim() : 'Jugador'
  return `name:${name}`
}

function hasReportedMeta(p: TournamentMetaParticipantDTO): boolean {
  return (
    p.deckPokemonSlugs.length > 0 || p.hasDecklist || p.matchRounds.length > 0
  )
}

/** POP IDs que figuraron en el torneo (clasificación TDF o emparejamientos sincronizados). */
function buildPlayedPopIdSet(doc: LeanEvent): Set<string> {
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

function participantPlayedTournament(
  p: LeanParticipant,
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

async function resolveTournamentMetaStore(
  storeId: unknown
): Promise<TournamentMetaStoreDTO | null> {
  if (!storeId || !mongoose.Types.ObjectId.isValid(String(storeId))) {
    return null
  }
  const lean = await Store.findById(String(storeId))
    .select('name slug logoUrl')
    .lean<{ name?: string; slug?: string; logoUrl?: string } | null>()
  if (!lean) return null
  const name = typeof lean.name === 'string' ? lean.name.trim() : ''
  const slug = typeof lean.slug === 'string' ? lean.slug.trim() : ''
  if (!name || !slug) return null
  return {
    name,
    slug,
    logoUrl: typeof lean.logoUrl === 'string' ? lean.logoUrl.trim() : ''
  }
}

export async function buildTournamentMetaPayload(
  doc: LeanEvent
): Promise<TournamentMetaPayload> {
  const parts = doc.participants ?? []
  const tournamentOrigin: 'official' | 'custom' =
    doc.tournamentOrigin === 'custom' ? 'custom' : 'official'
  const playedPopIds = buildPlayedPopIdSet(doc)
  const popToDisplayName = buildPopToDisplayNameMap(parts)
  const exposeDecksToOthers = canExposeParticipantDecksToOthers({
    state: doc.state,
    tournamentOrigin
  })
  const selfReportedDeckLookup = buildParticipantDeckLookup(parts)
  const bitacoraDeckLookup = exposeDecksToOthers
    ? buildBitacoraInferredDeckLookup(parts)
    : emptyParticipantDeckLookup()
  const roundSnapshots = doc.roundSnapshots ?? []

  const participants: TournamentMetaParticipantDTO[] = []

  for (const p of parts) {
    if (!participantPlayedTournament(p, playedPopIds, tournamentOrigin)) {
      continue
    }
    const displayName =
      typeof p.displayName === 'string' && p.displayName.trim()
        ? formatPersonDisplayName(p.displayName)
        : 'Jugador'
    const userId =
      p.userId && mongoose.Types.ObjectId.isValid(String(p.userId))
        ? String(p.userId)
        : null

    const popIdRaw = typeof p.popId === 'string' ? p.popId.trim() : ''
    const popIdStored = popidForStorage(popIdRaw) || popIdRaw || null

    let deckPokemonSlugs = Array.isArray(p.deckPokemonSlugs)
      ? p.deckPokemonSlugs.filter((s): s is string => typeof s === 'string')
      : []
    if (exposeDecksToOthers && deckPokemonSlugs.length === 0) {
      const nameKey = displayName.toLocaleLowerCase('es')
      const popKey = popIdStored ?? ''
      const inferred =
        (popKey ? bitacoraDeckLookup.byPop.get(popKey) : undefined) ??
        bitacoraDeckLookup.byName.get(nameKey)
      if (inferred?.length) deckPokemonSlugs = [...inferred]
    }

    const tdfFinal: { wins: number; losses: number; ties: number } | null =
      tournamentOrigin === 'official'
        ? {
            wins: Math.max(0, Math.min(999, Math.round(Number(p.wins) || 0))),
            losses: Math.max(
              0,
              Math.min(999, Math.round(Number(p.losses) || 0))
            ),
            ties: Math.max(0, Math.min(999, Math.round(Number(p.ties) || 0)))
          }
        : null

    const matchRounds = enrichMatchRoundsWithOpponentDecks(
      popIdStored,
      mergeParticipantMatchRoundsWithSnapshots(
        popIdStored,
        parseParticipantMatchRoundsFromLean(p.matchRounds),
        roundSnapshots,
        popToDisplayName,
        tdfFinal
      ),
      roundSnapshots,
      selfReportedDeckLookup,
      bitacoraDeckLookup,
      exposeDecksToOthers
    )

    let decklistDisplay: { decklistName: string; listLabel: string } | null =
      null
    const ref = p.tournamentDecklistRef
    const hasDecklistRef = Boolean(
      ref?.decklistId && userId && mongoose.Types.ObjectId.isValid(userId)
    )
    if (hasDecklistRef && userId) {
      decklistDisplay = await getTournamentDecklistDisplayLabels(
        new mongoose.Types.ObjectId(userId),
        ref
      )
    }

    let matchRecord: { wins: number; losses: number; ties: number } | null =
      null
    if (tournamentOrigin === 'custom' && matchRounds.length > 0) {
      matchRecord = matchRecordFromRounds(matchRounds)
    } else if (userId) {
      matchRecord = {
        wins: Math.max(0, Math.min(999, Math.round(Number(p.wins) || 0))),
        losses: Math.max(0, Math.min(999, Math.round(Number(p.losses) || 0))),
        ties: Math.max(0, Math.min(999, Math.round(Number(p.ties) || 0)))
      }
      if (
        matchRecord.wins === 0 &&
        matchRecord.losses === 0 &&
        matchRecord.ties === 0 &&
        matchRounds.length > 0
      ) {
        matchRecord = matchRecordFromRounds(matchRounds)
      }
    }

    participants.push({
      participantKey: participantKeyFromLean(p),
      userId,
      popId: popIdStored,
      displayName,
      deckPokemonSlugs,
      decklistDisplay,
      hasDecklist: hasDecklistRef && Boolean(decklistDisplay),
      matchRounds,
      matchRecord,
      standingPlace: null,
      standingIsDnf: false
    })
  }

  const standings = buildTournamentStandingsMeta(
    doc.tournamentStandings,
    participants,
    parts
  )
  const popStandingSort = buildPopStandingSortMap(standings)
  const standingLookup = buildParticipantStandingLookup(standings)

  const reportedOnly = participants.filter(hasReportedMeta).map(p => {
    const standing = lookupParticipantStanding(p, standingLookup)
    return {
      ...p,
      standingPlace: standing?.place ?? null,
      standingIsDnf: standing?.isDnf ?? false
    }
  })
  reportedOnly.sort((a, b) =>
    compareParticipantsByStanding(a, b, popStandingSort)
  )

  const stateRaw =
    doc.state === 'schedule' || doc.state === 'running' || doc.state === 'close'
      ? doc.state
      : 'schedule'

  const store = await resolveTournamentMetaStore(doc.storeId)

  return {
    event: {
      _id: String(doc._id),
      title: doc.title,
      startsAt: doc.startsAt.toISOString(),
      kind: doc.kind,
      game: doc.game,
      state: tournamentOrigin === 'custom' ? 'close' : stateRaw,
      tournamentOrigin
    },
    store,
    participants: reportedOnly,
    metagame: aggregateTournamentMetagame(reportedOnly),
    standings
  }
}

export function findParticipantByKey(
  participants: TournamentMetaParticipantDTO[],
  participantKey: string
): TournamentMetaParticipantDTO | undefined {
  const key = participantKey.trim()
  return participants.find(p => p.participantKey === key)
}
