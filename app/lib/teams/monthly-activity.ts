import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { getChileCalendarMonthRangeUtc } from '@/lib/contribution-points/chile-month-range'
import { buildMyTournamentWeekItemFromLean } from '@/lib/build-my-tournament-week-item'
import type { MyTournamentWeekItem } from '@/lib/my-tournament-week-types'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import { popidForStorage } from '@/lib/rut-chile'
import { TEAM_ROLE_LABELS, type TeamRole } from '@/lib/teams/constants'
import { weeklyEventTournamentReportProjection } from '@/lib/weekly-event-query-projections'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'

export type TeamMemberMonthlyTournament = {
  eventId: string
  title: string
  startsAt: string
  matchRecord: { wins: number; losses: number; ties: number } | null
  placement: MyTournamentWeekItem['placement']
}

export type TeamMemberMonthlyActivity = {
  userId: string
  displayName: string
  imageUrl: string | null
  roleLabel: string
  tournamentsPlayed: number
  topTournaments: TeamMemberMonthlyTournament[]
}

export type TeamMonthlyActivityDTO = {
  monthLabel: string
  monthKey: string
  members: TeamMemberMonthlyActivity[]
}

export function emptyTeamMonthlyActivity(): TeamMonthlyActivityDTO {
  const range = getChileCalendarMonthRangeUtc()
  return {
    monthLabel: range.monthLabel,
    monthKey: range.monthKey,
    members: []
  }
}

function tournamentRankScore(item: TeamMemberMonthlyTournament): number {
  const p = item.placement
  if (p?.isDnf) return 100_000
  if (p?.place != null) return p.place
  const wins = item.matchRecord?.wins ?? 0
  return 5_000 - wins * 10
}

function pickTopTournaments(
  items: TeamMemberMonthlyTournament[],
  limit = 3
): TeamMemberMonthlyTournament[] {
  return [...items]
    .sort((a, b) => {
      const scoreDiff = tournamentRankScore(a) - tournamentRankScore(b)
      if (scoreDiff !== 0) return scoreDiff
      const wA = a.matchRecord?.wins ?? 0
      const wB = b.matchRecord?.wins ?? 0
      if (wB !== wA) return wB - wA
      return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
    })
    .slice(0, limit)
}

function toMonthlyTournament(
  item: MyTournamentWeekItem
): TeamMemberMonthlyTournament {
  return {
    eventId: item.eventId,
    title: item.title,
    startsAt: item.startsAt,
    matchRecord: item.myMatchRecord,
    placement: item.placement
  }
}

export async function buildTeamMonthlyActivity(
  memberOids: mongoose.Types.ObjectId[],
  memberships: { userId: mongoose.Types.ObjectId; role: TeamRole }[]
): Promise<TeamMonthlyActivityDTO> {
  const monthRange = getChileCalendarMonthRangeUtc()

  if (memberOids.length === 0) {
    return {
      monthLabel: monthRange.monthLabel,
      monthKey: monthRange.monthKey,
      members: []
    }
  }

  await connectDB()

  const users = await User.find({ _id: { $in: memberOids } })
    .select('name email image popid')
    .lean<
      {
        _id: mongoose.Types.ObjectId
        name?: string
        email?: string
        image?: string
        popid?: string
      }[]
    >()

  const userById = new Map(users.map(u => [String(u._id), u]))
  const popByUserId = new Map(
    users.map(u => [
      String(u._id),
      popidForStorage(typeof u.popid === 'string' ? u.popid : '')
    ])
  )

  const events = await WeeklyEvent.find({
    kind: 'tournament',
    state: 'close',
    startsAt: { $gte: monthRange.start, $lt: monthRange.endExclusive },
    participants: { $elemMatch: { userId: { $in: memberOids } } }
  })
    .select(weeklyEventTournamentReportProjection)
    .sort({ startsAt: -1 })
    .lean()

  const members: TeamMemberMonthlyActivity[] = []

  for (const m of memberships) {
    const userId = String(m.userId)
    const u = userById.get(userId)
    const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
    const userPopId = popByUserId.get(userId) ?? ''

    const played: TeamMemberMonthlyTournament[] = []
    for (const ev of events) {
      const item = buildMyTournamentWeekItemFromLean(ev, userId, userPopId, {
        skipPlayedGate: false
      })
      if (!item) continue
      played.push(toMonthlyTournament(item))
    }

    members.push({
      userId,
      displayName,
      imageUrl,
      roleLabel: TEAM_ROLE_LABELS[m.role],
      tournamentsPlayed: played.length,
      topTournaments: pickTopTournaments(played)
    })
  }

  members.sort(
    (a, b) =>
      b.tournamentsPlayed - a.tournamentsPlayed ||
      a.displayName.localeCompare(b.displayName, 'es')
  )

  return {
    monthLabel: monthRange.monthLabel,
    monthKey: monthRange.monthKey,
    members
  }
}
