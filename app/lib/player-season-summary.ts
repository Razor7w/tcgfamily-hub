import 'server-only'

import mongoose from 'mongoose'
import {
  aggregateMyDeckStats,
  flattenUserMatchRounds,
  matchRoundsForSeasonStats,
  opponentDeckKey,
  winRatePercent,
  type TournamentOriginFilter
} from '@/lib/pokemon-matchup-stats'
import { batchTournamentDecklistDisplayLabels } from '@/lib/tournament-decklist-display'
import { originMongoFilter } from '@/lib/matchup-stats-cache'
import {
  type PlayerSeasonSummaryPayload,
  type PlayerSeasonRoundsPayload,
  type SeasonDeckRowDTO,
  type SeasonKpisDTO,
  type SeasonPeriod,
  type SeasonRecentRoundDTO
} from '@/lib/player-season-summary-types'
import { weeklyEventSeasonSummaryProjection } from '@/lib/weekly-event-query-projections'
import WeeklyEvent from '@/models/WeeklyEvent'

export type { PlayerSeasonSummaryPayload } from '@/lib/player-season-summary-types'

const MAX_SEASON_EVENTS = 250
const RECENT_ROUNDS_LIMIT = 10
const TOP_DECKS_LIMIT = 3

type LeanParticipant = {
  userId?: unknown
  popId?: string
  displayName?: string
  wins?: unknown
  losses?: unknown
  ties?: unknown
  matchRounds?: unknown
  deckPokemonSlugs?: unknown
  tournamentDecklistRef?: {
    decklistId?: unknown
    listKind?: string
    variantId?: unknown
  }
}

type LeanSeasonEvent = {
  _id?: unknown
  title?: string
  startsAt: Date | string
  tournamentOrigin?: string
  state?: string
  roundSnapshots?: import('@/lib/match-rounds-with-snapshots').RoundSnapshotLean[]
  participants?: LeanParticipant[]
}

function endOfMonth(refDate: Date): Date {
  return new Date(
    refDate.getFullYear(),
    refDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )
}

function endOfQuarter(refDate: Date): Date {
  const q = Math.floor(refDate.getMonth() / 3)
  return new Date(refDate.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999)
}

function endOfYear(refDate: Date): Date {
  return new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999)
}

function seasonPeriodBounds(
  period: SeasonPeriod,
  refDate = new Date()
): { from: Date; to: Date } | null {
  if (period === 'all') return null
  if (period === 'month') {
    return {
      from: new Date(refDate.getFullYear(), refDate.getMonth(), 1),
      to: endOfMonth(refDate)
    }
  }
  if (period === 'quarter') {
    const q = Math.floor(refDate.getMonth() / 3)
    return {
      from: new Date(refDate.getFullYear(), q * 3, 1),
      to: endOfQuarter(refDate)
    }
  }
  return {
    from: new Date(refDate.getFullYear(), 0, 1),
    to: endOfYear(refDate)
  }
}

function previousSeasonPeriodBounds(
  period: Exclude<SeasonPeriod, 'all'>,
  refDate = new Date()
): { from: Date; to: Date } {
  if (period === 'month') {
    const from = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1)
    const to = new Date(
      refDate.getFullYear(),
      refDate.getMonth(),
      0,
      23,
      59,
      59,
      999
    )
    return { from, to }
  }
  if (period === 'quarter') {
    const q = Math.floor(refDate.getMonth() / 3)
    const prevQ = q === 0 ? 3 : q - 1
    const year = q === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear()
    const from = new Date(year, prevQ * 3, 1)
    const to = new Date(year, prevQ * 3 + 3, 0, 23, 59, 59, 999)
    return { from, to }
  }
  const year = refDate.getFullYear() - 1
  return {
    from: new Date(year, 0, 1),
    to: new Date(year, 11, 31, 23, 59, 59, 999)
  }
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function slugsDeckLabel(slugs: string[]): string {
  if (slugs.length === 0) return 'Sin deck en perfil'
  return slugs.map(slugToTitle).join(' / ')
}

function deckLabelFromParts(
  slugs: string[],
  decklistName: string | null
): string {
  if (decklistName) return decklistName
  return slugsDeckLabel(slugs)
}

function myDeckSlugsFromParticipant(p: LeanParticipant): string[] {
  const raw = p.deckPokemonSlugs
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  )
}

async function loadSeasonEvents(
  uid: mongoose.Types.ObjectId,
  origin: TournamentOriginFilter,
  bounds: { from: Date; to: Date } | null
) {
  const dateFilter =
    bounds != null ? { startsAt: { $gte: bounds.from, $lte: bounds.to } } : {}

  return WeeklyEvent.find({
    kind: 'tournament' as const,
    game: 'pokemon' as const,
    ...originMongoFilter(origin),
    ...dateFilter,
    participants: { $elemMatch: { userId: uid } }
  })
    .sort({ startsAt: -1 })
    .limit(MAX_SEASON_EVENTS)
    .select(weeklyEventSeasonSummaryProjection)
    .lean()
}

async function decklistLabelsByEventId(
  userId: string,
  events: LeanSeasonEvent[]
): Promise<Map<string, { decklistName: string; listLabel: string }>> {
  const requests: {
    userId: string
    ref: NonNullable<LeanParticipant['tournamentDecklistRef']>
  }[] = []

  for (const ev of events) {
    const eventId = ev._id != null ? String(ev._id) : ''
    if (!eventId) continue
    const mine = (ev.participants ?? []).find(
      p => p?.userId != null && String(p.userId) === userId
    )
    const ref = mine?.tournamentDecklistRef
    if (ref?.decklistId) {
      requests.push({ userId, ref })
    }
  }

  const batch = await batchTournamentDecklistDisplayLabels(requests)
  const out = new Map<string, { decklistName: string; listLabel: string }>()

  for (const ev of events) {
    const eventId = ev._id != null ? String(ev._id) : ''
    if (!eventId) continue
    const mine = (ev.participants ?? []).find(
      p => p?.userId != null && String(p.userId) === userId
    )
    const ref = mine?.tournamentDecklistRef
    if (!ref?.decklistId) continue
    const hit = batch.get(`${userId}|${String(ref.decklistId)}`)
    if (hit) out.set(eventId, hit)
  }

  return out
}

function decklistMetaForDeckKey(
  events: LeanSeasonEvent[],
  userId: string,
  deckKey: string,
  labelsByEventId: Map<string, { decklistName: string; listLabel: string }>
): { decklistName: string | null; listLabel: string | null } {
  let bestT = -1
  let best: { decklistName: string; listLabel: string } | null = null

  for (const ev of events) {
    const eventId = ev._id != null ? String(ev._id) : ''
    const mine = (ev.participants ?? []).find(
      p => p?.userId != null && String(p.userId) === userId
    )
    if (!mine) continue
    const key = opponentDeckKey(myDeckSlugsFromParticipant(mine))
    if (key !== deckKey) continue
    const label = labelsByEventId.get(eventId)
    if (!label) continue
    const t = new Date(ev.startsAt).getTime()
    if (t >= bestT) {
      bestT = t
      best = label
    }
  }

  return best ?? { decklistName: null, listLabel: null }
}

function countTournamentsWithReport(
  events: LeanSeasonEvent[],
  userId: string,
  origin: TournamentOriginFilter
): number {
  let n = 0
  for (const ev of events) {
    const tor = ev.tournamentOrigin === 'custom' ? 'custom' : 'official'
    if (origin === 'official' && tor !== 'official') continue
    if (origin === 'custom' && tor !== 'custom') continue
    const mine = (ev.participants ?? []).find(
      p => p?.userId != null && String(p.userId) === userId
    )
    if (!mine) continue
    const rounds = matchRoundsForSeasonStats(
      ev as Parameters<typeof matchRoundsForSeasonStats>[0],
      mine as Parameters<typeof matchRoundsForSeasonStats>[1]
    )
    if (rounds.length > 0) n++
  }
  return n
}

function aggregateKpis(
  events: LeanSeasonEvent[],
  userId: string,
  origin: TournamentOriginFilter,
  labelsByEventId: Map<string, { decklistName: string; listLabel: string }>
): Omit<SeasonKpisDTO, 'trends'> {
  const myDecks = aggregateMyDeckStats(
    events as Parameters<typeof aggregateMyDeckStats>[0],
    userId,
    origin
  )

  const totalRounds = myDecks.reduce((s, d) => s + d.roundsPlayed, 0)
  const totalWins = myDecks.reduce((s, d) => s + d.wins, 0)
  const totalLosses = myDecks.reduce((s, d) => s + d.losses, 0)
  const totalTies = myDecks.reduce((s, d) => s + d.ties, 0)
  const globalWinRate = winRatePercent(totalWins, totalLosses, totalTies)

  const principal = [...myDecks].sort(
    (a, b) => b.roundsPlayed - a.roundsPlayed
  )[0]

  const principalDecklist = principal
    ? decklistMetaForDeckKey(
        events,
        userId,
        principal.myDeckKey,
        labelsByEventId
      )
    : null

  return {
    totalRounds,
    globalWinRate,
    principalDeck: principal
      ? {
          myDeckKey: principal.myDeckKey,
          myDeckSlugs: principal.myDeckSlugs,
          label: deckLabelFromParts(
            principal.myDeckSlugs,
            principalDecklist?.decklistName ?? null
          ),
          decklistName: principalDecklist?.decklistName ?? null,
          roundsPlayed: principal.roundsPlayed
        }
      : null,
    tournamentsWithReport: countTournamentsWithReport(events, userId, origin)
  }
}

function buildTopDecks(
  events: LeanSeasonEvent[],
  userId: string,
  origin: TournamentOriginFilter,
  labelsByEventId: Map<string, { decklistName: string; listLabel: string }>
): SeasonDeckRowDTO[] {
  const myDecks = aggregateMyDeckStats(
    events as Parameters<typeof aggregateMyDeckStats>[0],
    userId,
    origin
  )

  return [...myDecks]
    .filter(d => d.roundsPlayed > 0)
    .sort((a, b) => {
      const wa = winRatePercent(a.wins, a.losses, a.ties) ?? -1
      const wb = winRatePercent(b.wins, b.losses, b.ties) ?? -1
      if (wb !== wa) return wb - wa
      return b.roundsPlayed - a.roundsPlayed
    })
    .slice(0, TOP_DECKS_LIMIT)
    .map(row => {
      const meta = decklistMetaForDeckKey(
        events,
        userId,
        row.myDeckKey,
        labelsByEventId
      )

      return {
        myDeckKey: row.myDeckKey,
        myDeckSlugs: row.myDeckSlugs,
        label: deckLabelFromParts(row.myDeckSlugs, meta.decklistName),
        decklistName: meta.decklistName,
        listLabel: meta.listLabel,
        wins: row.wins,
        losses: row.losses,
        ties: row.ties,
        roundsPlayed: row.roundsPlayed,
        winRate: winRatePercent(row.wins, row.losses, row.ties),
        lastPlayedAt: row.lastPlayedAt
      }
    })
}

function buildSeasonRounds(
  events: LeanSeasonEvent[],
  userId: string,
  origin: TournamentOriginFilter,
  labelsByEventId: Map<string, { decklistName: string; listLabel: string }>,
  limit?: number
): SeasonRecentRoundDTO[] {
  let flat = flattenUserMatchRounds(
    events as Parameters<typeof flattenUserMatchRounds>[0],
    userId,
    origin
  )
  if (limit != null) flat = flat.slice(0, limit)

  return flat.map(row => {
    const decklistName = labelsByEventId.get(row.eventId)?.decklistName ?? null
    const opponentSlugs = row.opponentDeckSlugs ?? []
    return {
      ...row,
      myDeckLabel: deckLabelFromParts(row.myDeckSlugs, decklistName),
      opponentDeckLabel:
        row.opponentDisplayName?.trim() ||
        (opponentSlugs.length > 0
          ? slugsDeckLabel(opponentSlugs)
          : 'Rival sin deck'),
      decklistName
    }
  })
}

function computeTrends(
  period: SeasonPeriod,
  current: Omit<SeasonKpisDTO, 'trends'>,
  previous: Omit<SeasonKpisDTO, 'trends'>
): SeasonKpisDTO['trends'] {
  if (period === 'all') return null

  let roundsDeltaPct: number | null = null
  if (previous.totalRounds > 0) {
    roundsDeltaPct =
      ((current.totalRounds - previous.totalRounds) / previous.totalRounds) *
      100
  } else if (current.totalRounds > 0) {
    roundsDeltaPct = 100
  }

  let winRateDeltaPts: number | null = null
  if (current.globalWinRate != null && previous.globalWinRate != null) {
    winRateDeltaPts = current.globalWinRate - previous.globalWinRate
  }

  return { roundsDeltaPct, winRateDeltaPts }
}

export async function buildPlayerSeasonSummary(
  userId: string,
  uid: mongoose.Types.ObjectId,
  period: SeasonPeriod,
  origin: TournamentOriginFilter
): Promise<PlayerSeasonSummaryPayload> {
  const bounds = seasonPeriodBounds(period)
  const events = (await loadSeasonEvents(
    uid,
    origin,
    bounds
  )) as LeanSeasonEvent[]
  const labelsByEventId = await decklistLabelsByEventId(userId, events)

  const kpisBase = aggregateKpis(events, userId, origin, labelsByEventId)

  let trends: SeasonKpisDTO['trends'] = null
  if (period !== 'all') {
    const prevBounds = previousSeasonPeriodBounds(period)
    const prevEvents = (await loadSeasonEvents(
      uid,
      origin,
      prevBounds
    )) as LeanSeasonEvent[]
    const prevKpis = aggregateKpis(prevEvents, userId, origin, new Map())
    trends = computeTrends(period, kpisBase, prevKpis)
  }

  return {
    period,
    origin,
    kpis: { ...kpisBase, trends },
    recentRounds: buildSeasonRounds(
      events,
      userId,
      origin,
      labelsByEventId,
      RECENT_ROUNDS_LIMIT
    ),
    topDecks: buildTopDecks(events, userId, origin, labelsByEventId),
    eventsScanned: events.length
  }
}

export async function buildPlayerSeasonRounds(
  userId: string,
  uid: mongoose.Types.ObjectId,
  period: SeasonPeriod,
  origin: TournamentOriginFilter
): Promise<PlayerSeasonRoundsPayload> {
  const bounds = seasonPeriodBounds(period)
  const events = (await loadSeasonEvents(
    uid,
    origin,
    bounds
  )) as LeanSeasonEvent[]
  const labelsByEventId = await decklistLabelsByEventId(userId, events)

  return {
    period,
    origin,
    rounds: buildSeasonRounds(events, userId, origin, labelsByEventId),
    eventsScanned: events.length
  }
}
