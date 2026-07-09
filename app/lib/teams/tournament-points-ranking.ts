import 'server-only'

import connectDB from '@/lib/mongodb'
import { getChileCalendarMonthRangeUtc } from '@/lib/contribution-points/chile-month-range'
import {
  leagueMergeSource,
  pointsFromWLRecord,
  type LeanEventForLeague
} from '@/lib/league-aggregate'
import { loadApprovedTeamRosterIndex } from '@/lib/teams/league-ranking'
import { weeklyEventLeagueAggregateProjection } from '@/lib/weekly-event-query-projections'
import WeeklyEvent from '@/models/WeeklyEvent'

export type TeamTournamentPointsRankingPeriod = 'month' | 'all'

export type TeamTournamentPointsTopMember = {
  userId: string
  displayName: string
  points: number
}

export type TeamTournamentPointsRankingRow = {
  rank: number
  teamId: string
  name: string
  slug: string
  logoUrl: string
  memberCount: number
  totalPoints: number
  topMembers: TeamTournamentPointsTopMember[]
}

export type TeamTournamentPointsRankingResult = {
  enabled: boolean
  period: TeamTournamentPointsRankingPeriod
  periodLabel: string
  rows: TeamTournamentPointsRankingRow[]
}

const TOP_MEMBERS_PER_TEAM = 3
const OFFICIAL_TOURNAMENT_CURSOR_BATCH = 20

function officialClosedTournamentFilter(
  period: TeamTournamentPointsRankingPeriod
): Record<string, unknown> {
  const monthRange = period === 'month' ? getChileCalendarMonthRangeUtc() : null

  const filter: Record<string, unknown> = {
    kind: 'tournament',
    tournamentOrigin: 'official',
    state: 'close'
  }

  if (monthRange) {
    filter.startsAt = {
      $gte: monthRange.start,
      $lt: monthRange.endExclusive
    }
  }

  return filter
}

/** Suma puntos por POP en streaming (cursor) sin cargar todos los torneos en RAM. */
async function aggregateOfficialTournamentPointsByPopId(
  period: TeamTournamentPointsRankingPeriod
): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  const cursor = WeeklyEvent.find(officialClosedTournamentFilter(period))
    .select(weeklyEventLeagueAggregateProjection)
    .lean()
    .cursor({ batchSize: OFFICIAL_TOURNAMENT_CURSOR_BATCH })

  for await (const raw of cursor) {
    const ev = raw as LeanEventForLeague
    const { byPop } = leagueMergeSource(ev)
    for (const [popId, rec] of byPop) {
      if (rec.w + rec.l + rec.t === 0) continue
      const pts = pointsFromWLRecord(rec.w, rec.l, rec.t)
      if (pts <= 0) continue
      totals.set(popId, (totals.get(popId) ?? 0) + pts)
    }
  }

  return totals
}

export async function buildTeamTournamentPointsRanking(input?: {
  period?: TeamTournamentPointsRankingPeriod
}): Promise<TeamTournamentPointsRankingResult> {
  const period = input?.period === 'all' ? 'all' : 'month'
  const periodLabel =
    period === 'all' ? 'Histórico' : getChileCalendarMonthRangeUtc().monthLabel

  await connectDB()

  const [pointsByPopId, roster] = await Promise.all([
    aggregateOfficialTournamentPointsByPopId(period),
    loadApprovedTeamRosterIndex()
  ])

  const pointsByUserId = new Map<
    string,
    { displayName: string; points: number }
  >()

  for (const [popId, points] of pointsByPopId) {
    const member = roster.byPopId.get(popId)
    if (!member) continue
    pointsByUserId.set(member.userId, {
      displayName: member.displayName,
      points
    })
  }

  const membersByTeam = new Map<
    string,
    { userId: string; displayName: string }[]
  >()

  for (const member of roster.byUserId.values()) {
    const list = membersByTeam.get(member.teamId) ?? []
    list.push({ userId: member.userId, displayName: member.displayName })
    membersByTeam.set(member.teamId, list)
  }

  const teamRows: Omit<TeamTournamentPointsRankingRow, 'rank'>[] = []

  for (const [teamId, meta] of roster.teamMeta) {
    const members = membersByTeam.get(teamId) ?? []
    const scored = members
      .map(member => ({
        userId: member.userId,
        displayName:
          pointsByUserId.get(member.userId)?.displayName ?? member.displayName,
        points: pointsByUserId.get(member.userId)?.points ?? 0
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          a.displayName.localeCompare(b.displayName, 'es')
      )

    const topMembers = scored.slice(0, TOP_MEMBERS_PER_TEAM)
    const totalPoints = topMembers.reduce(
      (sum, member) => sum + member.points,
      0
    )

    teamRows.push({
      teamId,
      name: meta.name,
      slug: meta.slug,
      logoUrl: meta.logoUrl,
      memberCount: roster.rosterSizeByTeam.get(teamId) ?? members.length,
      totalPoints,
      topMembers
    })
  }

  teamRows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  )

  const rows: TeamTournamentPointsRankingRow[] = teamRows.map((row, index) => ({
    ...row,
    rank: index + 1
  }))

  return { enabled: true, period, periodLabel, rows }
}
