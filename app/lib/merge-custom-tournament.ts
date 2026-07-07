import 'server-only'

import mongoose from 'mongoose'
import {
  buildParticipantDeckLookup,
  buildPopToDisplayNameMap,
  emptyParticipantDeckLookup,
  mergeParticipantMatchRoundsWithSnapshots,
  recordBeforeRoundFromSnapshots,
  inferRoundOutcomeFromRecordDelta,
  reconcileOfficialClosedRoundsWithSnapshots,
  stripManualOpponentDecksWhenPlatformReported,
  type RoundSnapshotLean,
  type WltRecord
} from '@/lib/match-rounds-with-snapshots'
import { applyDeckContributionAwards } from '@/lib/contribution-points/deck-contribution-awards'
import { applyMatchRoundContributionAwards } from '@/lib/contribution-points/match-round-contribution-awards'
import { resolveWeeklyEventStoreIdForContribution } from '@/lib/contribution-points/resolve-event-store-id'
import { invalidateMatchupStatsCacheForUser } from '@/lib/matchup-stats-cache'
import { syncTournamentMetaCacheAfterEventMutation } from '@/lib/tournament-meta-cache'
import { canExposeParticipantDecksToOthers } from '@/lib/weekly-events'
import { popidForStorage } from '@/lib/rut-chile'
import {
  parseParticipantMatchRoundsFromLean,
  trimOpponentDisplayName,
  type ParticipantMatchRoundDTO
} from '@/lib/participant-match-round'
import { officialUserPlayedClosedTournament } from '@/lib/tournament-participant-played'
import { validateTournamentDecklistRefForUser } from '@/lib/validate-tournament-decklist-ref'
import { weeklyEventRoundSnapshotsWltProjection } from '@/lib/weekly-event-query-projections'
import type { ContributionPointsAwardedItem } from '@/lib/contribution-points-public'
import WeeklyEvent from '@/models/WeeklyEvent'
import type { IParticipantMatchRound } from '@/models/WeeklyEvent'

export type LinkableOfficialTournamentDTO = {
  eventId: string
  title: string
  startsAt: string
  myMatchRecord: { wins: number; losses: number; ties: number } | null
  hasMyReportedRounds: boolean
  hasMyDeck: boolean
}

export type MergeCustomTournamentResult = {
  officialEventId: string
  mergedRoundsCount: number
  deckMerged: boolean
  decklistMerged: boolean
  contributionPointsAwarded: ContributionPointsAwardedItem[]
}

function clampWlt(n: unknown): number {
  return Math.max(0, Math.min(999, Math.round(Number(n) || 0)))
}

function finalRecordFromParticipant(part: {
  wins?: unknown
  losses?: unknown
  ties?: unknown
}): WltRecord {
  return {
    wins: clampWlt(part.wins),
    losses: clampWlt(part.losses),
    ties: clampWlt(part.ties)
  }
}

function hasDeckSlugs(slugs: unknown): boolean {
  return (
    Array.isArray(slugs) &&
    slugs.some(s => typeof s === 'string' && s.trim().length > 0)
  )
}

function customHasTransferableData(part: {
  deckPokemonSlugs?: unknown
  tournamentDecklistRef?: unknown
  matchRounds?: unknown
}): boolean {
  if (hasDeckSlugs(part.deckPokemonSlugs)) return true
  if (part.tournamentDecklistRef) return true
  return parseParticipantMatchRoundsFromLean(part.matchRounds).length > 0
}

function snapshotWltForRound(
  roundNum: number,
  myPop: string,
  snapshots: RoundSnapshotLean[],
  popToDisplayName: Map<string, string>,
  finalRecord: WltRecord | null,
  opponentHint?: string | null
): Pick<ParticipantMatchRoundDTO, 'gameResults' | 'specialOutcome'> | null {
  const stub: ParticipantMatchRoundDTO = {
    roundNum,
    opponentDisplayName: opponentHint ?? '',
    opponentDeckSlugs: [],
    gameResults: [],
    turnOrders: [],
    specialOutcome: null
  }
  const [merged] = mergeParticipantMatchRoundsWithSnapshots(
    myPop,
    [stub],
    snapshots,
    popToDisplayName,
    finalRecord
  )
  if (merged.specialOutcome === 'bye') {
    return { gameResults: [], specialOutcome: 'bye' }
  }
  if (merged.gameResults.length > 0) {
    return {
      gameResults: merged.gameResults,
      specialOutcome: merged.specialOutcome ?? null
    }
  }
  if (merged.specialOutcome) {
    return { gameResults: [], specialOutcome: merged.specialOutcome }
  }

  const before = recordBeforeRoundFromSnapshots(myPop, roundNum, snapshots)
  if (!before) return null

  const roundNums = snapshots
    .map(s => Math.round(Number(s.roundNum)))
    .filter(n => Number.isFinite(n) && n >= 1)
  const maxRound = roundNums.length > 0 ? Math.max(...roundNums) : 0

  let after: WltRecord | null = null
  if (roundNum < maxRound) {
    after = recordBeforeRoundFromSnapshots(myPop, roundNum + 1, snapshots)
  } else if (finalRecord) {
    after = finalRecord
  }
  if (!after) return null

  const inferred = inferRoundOutcomeFromRecordDelta(before, after)
  if (!inferred) return null
  return inferred
}

function officialRoundHasWlt(round: ParticipantMatchRoundDTO): boolean {
  return round.gameResults.length > 0 || Boolean(round.specialOutcome)
}

function mergeSingleRound(
  officialRound: ParticipantMatchRoundDTO | undefined,
  customRound: ParticipantMatchRoundDTO,
  snapshots: RoundSnapshotLean[],
  popToDisplayName: Map<string, string>,
  myPop: string,
  finalRecord: WltRecord | null
): ParticipantMatchRoundDTO {
  const base = officialRound
    ? { ...officialRound }
    : {
        roundNum: customRound.roundNum,
        opponentDisplayName: customRound.opponentDisplayName,
        opponentDeckSlugs: [...customRound.opponentDeckSlugs],
        gameResults: [...customRound.gameResults],
        turnOrders: [...customRound.turnOrders],
        specialOutcome: customRound.specialOutcome ?? null
      }

  const opponentHint =
    trimOpponentDisplayName(base.opponentDisplayName) ??
    trimOpponentDisplayName(customRound.opponentDisplayName)
  const fromSnap = mergeParticipantMatchRoundsWithSnapshots(
    myPop,
    [
      {
        roundNum: customRound.roundNum,
        opponentDisplayName: opponentHint ?? '',
        opponentDeckSlugs: [],
        gameResults: [],
        turnOrders: [],
        specialOutcome: null
      }
    ],
    snapshots,
    popToDisplayName,
    finalRecord
  )[0]
  if (fromSnap.opponentDisplayName) {
    base.opponentDisplayName = fromSnap.opponentDisplayName
  } else if (!trimOpponentDisplayName(base.opponentDisplayName)) {
    const customName = trimOpponentDisplayName(customRound.opponentDisplayName)
    if (customName) base.opponentDisplayName = customName
  }

  if (!base.opponentDeckSlugs.length && customRound.opponentDeckSlugs.length) {
    base.opponentDeckSlugs = [...customRound.opponentDeckSlugs]
  }

  if (!base.turnOrders.length && customRound.turnOrders.length) {
    base.turnOrders = [...customRound.turnOrders]
  }

  const officialWlt = snapshotWltForRound(
    customRound.roundNum,
    myPop,
    snapshots,
    popToDisplayName,
    finalRecord,
    base.opponentDisplayName
  )

  if (officialWlt) {
    base.gameResults = [...officialWlt.gameResults]
    base.specialOutcome = officialWlt.specialOutcome ?? null
  } else if (officialRound && officialRoundHasWlt(officialRound)) {
    base.gameResults = [...officialRound.gameResults]
    base.specialOutcome = officialRound.specialOutcome ?? null
  } else {
    base.gameResults = [...customRound.gameResults]
    base.specialOutcome = customRound.specialOutcome ?? null
  }

  return base
}

export function mergeCustomRoundsIntoOfficial(
  officialStored: ParticipantMatchRoundDTO[],
  customStored: ParticipantMatchRoundDTO[],
  snapshots: RoundSnapshotLean[],
  popToDisplayName: Map<string, string>,
  myPop: string,
  finalRecord: WltRecord | null
): ParticipantMatchRoundDTO[] {
  const byRound = new Map(
    officialStored.map(round => [round.roundNum, { ...round }])
  )

  for (const customRound of customStored) {
    const officialRound = byRound.get(customRound.roundNum)
    byRound.set(
      customRound.roundNum,
      mergeSingleRound(
        officialRound,
        customRound,
        snapshots,
        popToDisplayName,
        myPop,
        finalRecord
      )
    )
  }

  return [...byRound.values()].sort((a, b) => a.roundNum - b.roundNum)
}

function toPersistedRound(
  row: ParticipantMatchRoundDTO
): IParticipantMatchRound {
  const opponentDisplayName = trimOpponentDisplayName(row.opponentDisplayName)
  return {
    roundNum: row.roundNum,
    opponentDisplayName: opponentDisplayName ?? '',
    opponentDeckSlugs: row.opponentDeckSlugs,
    gameResults: row.gameResults,
    turnOrders: row.turnOrders,
    ...(row.specialOutcome ? { specialOutcome: row.specialOutcome } : {})
  }
}

export async function listLinkableOfficialTournaments(
  userId: string,
  uid: mongoose.Types.ObjectId,
  customEventId: string,
  userPopId: string
): Promise<LinkableOfficialTournamentDTO[]> {
  const custom = await WeeklyEvent.findById(customEventId)
    .select({ tournamentOrigin: 1, createdByUserId: 1, participants: 1 })
    .lean()
  if (!custom || custom.tournamentOrigin !== 'custom') {
    throw new Error('Solo aplica a torneos personalizados')
  }

  const createdBy = custom.createdByUserId ? String(custom.createdByUserId) : ''
  const customPart = (custom.participants ?? []).find(
    p => p.userId && String(p.userId) === userId
  )
  const isCreator =
    createdBy === userId ||
    (!createdBy &&
      Boolean(customPart?.userId && String(customPart.userId) === userId))
  if (!isCreator) {
    throw new Error('No autorizado')
  }

  const docs = await WeeklyEvent.find({
    _id: { $ne: custom._id },
    kind: 'tournament',
    game: 'pokemon',
    state: 'close',
    tournamentOrigin: { $ne: 'custom' },
    'participants.userId': uid
  })
    .select({
      title: 1,
      startsAt: 1,
      participants: 1,
      tournamentStandings: 1,
      roundSnapshots: 1
    })
    .sort({ startsAt: -1 })
    .limit(40)
    .lean()

  const out: LinkableOfficialTournamentDTO[] = []
  for (const doc of docs) {
    const mine = (doc.participants ?? []).find(
      p => p.userId && String(p.userId) === userId
    )
    if (!mine) continue
    if (
      !officialUserPlayedClosedTournament(mine, userPopId, {
        tournamentStandings: doc.tournamentStandings,
        roundSnapshots: doc.roundSnapshots
      })
    ) {
      continue
    }

    const w = clampWlt(mine.wins)
    const l = clampWlt(mine.losses)
    const t = clampWlt(mine.ties)
    const recordSum = w + l + t

    out.push({
      eventId: String(doc._id),
      title: String(doc.title ?? 'Torneo'),
      startsAt: new Date(doc.startsAt).toISOString(),
      myMatchRecord: recordSum > 0 ? { wins: w, losses: l, ties: t } : null,
      hasMyReportedRounds:
        parseParticipantMatchRoundsFromLean(mine.matchRounds).length > 0,
      hasMyDeck: hasDeckSlugs(mine.deckPokemonSlugs)
    })
  }

  return out
}

export async function executeMergeCustomIntoOfficial(input: {
  userId: string
  uid: mongoose.Types.ObjectId
  customEventId: string
  officialEventId: string
  userPopId: string
  activeStoreId?: string
}): Promise<MergeCustomTournamentResult> {
  const {
    userId,
    uid,
    customEventId,
    officialEventId,
    userPopId,
    activeStoreId
  } = input

  if (customEventId === officialEventId) {
    throw new Error('El torneo destino debe ser distinto al custom')
  }

  const [customDoc, officialDoc] = await Promise.all([
    WeeklyEvent.findById(customEventId).select({
      kind: 1,
      game: 1,
      title: 1,
      tournamentOrigin: 1,
      createdByUserId: 1,
      participants: 1,
      storeId: 1
    }),
    WeeklyEvent.findById(officialEventId).select({
      kind: 1,
      game: 1,
      title: 1,
      state: 1,
      tournamentOrigin: 1,
      storeId: 1,
      leagueId: 1,
      participants: 1,
      ...weeklyEventRoundSnapshotsWltProjection
    })
  ])

  if (!customDoc || !officialDoc) {
    throw new Error('Torneo no encontrado')
  }

  if (customDoc.kind !== 'tournament' || customDoc.game !== 'pokemon') {
    throw new Error('Solo aplica a torneos Pokémon')
  }
  if (officialDoc.kind !== 'tournament' || officialDoc.game !== 'pokemon') {
    throw new Error('El torneo destino debe ser Pokémon')
  }

  if (customDoc.tournamentOrigin !== 'custom') {
    throw new Error('Solo puedes vincular torneos personalizados')
  }
  if (officialDoc.tournamentOrigin === 'custom') {
    throw new Error('El destino debe ser un torneo oficial')
  }
  if (officialDoc.state !== 'close') {
    throw new Error('El torneo oficial debe estar finalizado')
  }

  const createdBy = customDoc.createdByUserId
    ? String(customDoc.createdByUserId)
    : ''
  const customPart = customDoc.participants.find(
    p => p.userId && String(p.userId) === userId
  )
  const isCreator =
    createdBy === userId ||
    (!createdBy &&
      Boolean(customPart?.userId && String(customPart.userId) === userId))
  if (!isCreator || !customPart) {
    throw new Error('No autorizado')
  }

  const officialPart = officialDoc.participants.find(
    p => p.userId && String(p.userId) === userId
  )
  if (!officialPart) {
    throw new Error('Debes estar inscrito en el torneo oficial')
  }

  if (
    !officialUserPlayedClosedTournament(officialPart, userPopId, {
      tournamentStandings: officialDoc.tournamentStandings,
      roundSnapshots: officialDoc.roundSnapshots as RoundSnapshotLean[]
    })
  ) {
    throw new Error(
      'Tu POP ID no figura entre los jugadores del torneo oficial'
    )
  }

  if (!customHasTransferableData(customPart)) {
    throw new Error('El torneo custom no tiene rondas ni deck para transferir')
  }

  const previousSlugs = Array.isArray(officialPart.deckPokemonSlugs)
    ? [...officialPart.deckPokemonSlugs]
    : []
  const previousDecklistRef = officialPart.tournamentDecklistRef
    ? {
        decklistId: officialPart.tournamentDecklistRef.decklistId,
        listKind: officialPart.tournamentDecklistRef.listKind,
        variantId: officialPart.tournamentDecklistRef.variantId
      }
    : null
  const storedOfficialRounds = parseParticipantMatchRoundsFromLean(
    officialPart.matchRounds
  )
  const customRounds = parseParticipantMatchRoundsFromLean(
    customPart.matchRounds
  )

  let deckMerged = false
  let decklistMerged = false

  if (
    !hasDeckSlugs(officialPart.deckPokemonSlugs) &&
    hasDeckSlugs(customPart.deckPokemonSlugs)
  ) {
    officialPart.deckPokemonSlugs = [...(customPart.deckPokemonSlugs ?? [])]
    deckMerged = true
  }

  if (!officialPart.tournamentDecklistRef && customPart.tournamentDecklistRef) {
    const customRef = customPart.tournamentDecklistRef
    const slugsForValidation = hasDeckSlugs(officialPart.deckPokemonSlugs)
      ? officialPart.deckPokemonSlugs!
      : (customPart.deckPokemonSlugs ?? [])
    const checked = await validateTournamentDecklistRefForUser(
      uid,
      {
        decklistId: String(customRef.decklistId),
        listKind: customRef.listKind === 'variant' ? 'variant' : 'base',
        variantId: customRef.variantId ? String(customRef.variantId) : null
      },
      slugsForValidation
    )
    if (!checked.ok) {
      throw new Error('El listado guardado del torneo custom ya no es válido')
    }
    officialPart.tournamentDecklistRef = {
      decklistId: checked.value.decklistId,
      listKind: checked.value.listKind,
      variantId: checked.value.variantId ?? undefined
    }
    decklistMerged = true
  }

  const snapshots = (officialDoc.roundSnapshots ?? []) as RoundSnapshotLean[]
  const popToDisplayName = buildPopToDisplayNameMap(
    (officialDoc.participants ?? []) as {
      displayName?: string
      popId?: string
    }[]
  )
  const myPop = popidForStorage(
    typeof officialPart.popId === 'string' && officialPart.popId.trim()
      ? officialPart.popId
      : userPopId
  )
  const finalRecord = finalRecordFromParticipant(officialPart)

  const mergedRounds = reconcileOfficialClosedRoundsWithSnapshots(
    mergeCustomRoundsIntoOfficial(
      storedOfficialRounds,
      customRounds,
      snapshots,
      popToDisplayName,
      myPop,
      finalRecord
    ),
    myPop,
    snapshots,
    finalRecord
  )

  const recordSum = finalRecord.wins + finalRecord.losses + finalRecord.ties
  const maxRoundsAllowed = recordSum > 0 ? recordSum : 15
  if (mergedRounds.length > maxRoundsAllowed) {
    throw new Error(
      `El torneo oficial solo admite ${maxRoundsAllowed} ronda(s) según tu récord W-L-T`
    )
  }

  const exposeOpponentDecksToOthers = canExposeParticipantDecksToOthers({
    state: officialDoc.state,
    tournamentOrigin: 'official'
  })
  const selfReportedDeckLookup = exposeOpponentDecksToOthers
    ? buildParticipantDeckLookup(
        (officialDoc.participants ?? []) as {
          displayName?: string
          popId?: string
          deckPokemonSlugs?: unknown
        }[]
      )
    : emptyParticipantDeckLookup()

  const roundsToPersist = stripManualOpponentDecksWhenPlatformReported(
    myPop,
    mergedRounds,
    snapshots,
    selfReportedDeckLookup,
    exposeOpponentDecksToOthers
  )

  officialPart.matchRounds = roundsToPersist.map(toPersistedRound)

  const storeIdForContribution = await resolveWeeklyEventStoreIdForContribution(
    officialDoc,
    activeStoreId
  )
  if (!officialDoc.storeId && storeIdForContribution) {
    officialDoc.storeId = storeIdForContribution
  }

  officialDoc.markModified('participants')
  await officialDoc.save()

  let contributionPointsAwarded: ContributionPointsAwardedItem[] = []

  if (storeIdForContribution) {
    const deckAwards = await applyDeckContributionAwards({
      storeId: storeIdForContribution,
      userId: uid,
      eventId: officialDoc._id,
      eventTitle: String(officialDoc.title ?? 'Torneo'),
      tournamentOrigin: 'official',
      previousSlugs,
      nextSlugs: officialPart.deckPokemonSlugs ?? [],
      previousDecklistRef,
      nextDecklistRef: officialPart.tournamentDecklistRef
        ? {
            decklistId: officialPart.tournamentDecklistRef.decklistId,
            listKind: officialPart.tournamentDecklistRef.listKind,
            variantId: officialPart.tournamentDecklistRef.variantId
          }
        : null,
      userInitiatedSave: true
    })
    const roundAwards = await applyMatchRoundContributionAwards({
      storeId: storeIdForContribution,
      userId: uid,
      eventId: officialDoc._id,
      eventTitle: String(officialDoc.title ?? 'Torneo'),
      tournamentOrigin: 'official',
      stored: storedOfficialRounds,
      next: roundsToPersist
    })

    contributionPointsAwarded = [...deckAwards, ...roundAwards].filter(
      row => row.awarded && row.points > 0
    )
  }

  await WeeklyEvent.deleteOne({ _id: customDoc._id })

  await Promise.all([
    syncTournamentMetaCacheAfterEventMutation(
      String(officialDoc._id),
      officialDoc
    ),
    invalidateMatchupStatsCacheForUser(userId)
  ])

  return {
    officialEventId: String(officialDoc._id),
    mergedRoundsCount: customRounds.length,
    deckMerged,
    decklistMerged,
    contributionPointsAwarded
  }
}
