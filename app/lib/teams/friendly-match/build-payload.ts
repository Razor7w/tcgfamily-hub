import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import {
  TEAM_FRIENDLY_DUEL_COUNT,
  TEAM_FRIENDLY_MATCH_STATUS_LABELS,
  type TeamFriendlyMatchStatus
} from '@/lib/teams/friendly-match/constants'
import { friendlyMatchAllowsCaptainModeration } from '@/lib/teams/friendly-match/lifecycle'
import type {
  FriendlyDuelDTO,
  FriendlyLineupPlayerDTO,
  FriendlyMatchTeamSummaryDTO,
  TeamFriendlyMatchDetailDTO,
  TeamFriendlyMatchListItemDTO
} from '@/lib/teams/friendly-match/types'
import Team from '@/models/Team'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'
import TeamFriendlyMatchDuel from '@/models/TeamFriendlyMatchDuel'
import User from '@/models/User'

type LeanTeam = {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  logoUrl?: string
}

type LeanUser = {
  _id: mongoose.Types.ObjectId
  name?: string
  email?: string
  image?: string
}

function lineupToDto(
  slots: { userId: mongoose.Types.ObjectId; slot: number }[],
  userById: Map<string, LeanUser>
): FriendlyLineupPlayerDTO[] {
  return [...slots]
    .sort((a, b) => a.slot - b.slot)
    .map(slot => {
      const u = userById.get(String(slot.userId))
      const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
      return {
        userId: String(slot.userId),
        displayName,
        imageUrl,
        slot: slot.slot
      }
    })
}

function teamSummary(
  team: LeanTeam,
  lineup: FriendlyLineupPlayerDTO[],
  points: number
): FriendlyMatchTeamSummaryDTO {
  return {
    teamId: String(team._id),
    name: team.name,
    slug: team.slug,
    logoUrl: typeof team.logoUrl === 'string' ? team.logoUrl : '',
    points,
    lineup
  }
}

function viewerSideForMatch(
  match: {
    challengerTeamId: mongoose.Types.ObjectId
    opponentTeamId: mongoose.Types.ObjectId
  },
  viewerTeamId: string | null
): 'challenger' | 'opponent' | null {
  if (!viewerTeamId) return null
  if (String(match.challengerTeamId) === viewerTeamId) return 'challenger'
  if (String(match.opponentTeamId) === viewerTeamId) return 'opponent'
  return null
}

export async function buildTeamFriendlyMatchList(
  teamId: mongoose.Types.ObjectId,
  viewerUserId: string,
  canManage: boolean
): Promise<TeamFriendlyMatchListItemDTO[]> {
  await connectDB()

  const matches = await TeamFriendlyMatch.find({
    $or: [{ challengerTeamId: teamId }, { opponentTeamId: teamId }]
  })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean()

  if (matches.length === 0) return []

  const teamIds = new Set<string>()
  const userIds = new Set<string>()
  const matchIds: mongoose.Types.ObjectId[] = []

  for (const match of matches) {
    teamIds.add(String(match.challengerTeamId))
    teamIds.add(String(match.opponentTeamId))
    userIds.add(String(match.requestedByUserId))
    matchIds.push(match._id as mongoose.Types.ObjectId)
    for (const slot of match.challengerLineup ?? []) {
      userIds.add(String(slot.userId))
    }
    for (const slot of match.opponentLineup ?? []) {
      userIds.add(String(slot.userId))
    }
  }

  const [teams, users, duelCounts] = await Promise.all([
    Team.find({
      _id: {
        $in: [...teamIds].map(id => new mongoose.Types.ObjectId(id))
      }
    })
      .select('name slug logoUrl')
      .lean<LeanTeam[]>(),
    User.find({
      _id: { $in: [...userIds].map(id => new mongoose.Types.ObjectId(id)) }
    })
      .select('name email image')
      .lean<LeanUser[]>(),
    TeamFriendlyMatchDuel.aggregate<{
      _id: mongoose.Types.ObjectId
      confirmed: number
    }>([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$matchId',
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          }
        }
      }
    ])
  ])

  const teamById = new Map(teams.map(t => [String(t._id), t]))
  const userById = new Map(users.map(u => [String(u._id), u]))
  const confirmedByMatch = new Map(
    duelCounts.map(row => [String(row._id), row.confirmed])
  )

  const viewerTeamId = String(teamId)

  return matches
    .map(match => {
      const challengerTeam = teamById.get(String(match.challengerTeamId))
      const opponentTeam = teamById.get(String(match.opponentTeamId))
      if (!challengerTeam || !opponentTeam) return null

      const status = match.status as TeamFriendlyMatchStatus
      const challengerLineup = lineupToDto(
        match.challengerLineup ?? [],
        userById
      )
      const opponentLineup = lineupToDto(match.opponentLineup ?? [], userById)
      const viewerSide = viewerSideForMatch(match, viewerTeamId)

      const row: TeamFriendlyMatchListItemDTO = {
        id: String(match._id),
        status,
        statusLabel: TEAM_FRIENDLY_MATCH_STATUS_LABELS[status] ?? status,
        createdAt:
          match.createdAt instanceof Date
            ? match.createdAt.toISOString()
            : new Date().toISOString(),
        expiresAt:
          match.expiresAt instanceof Date
            ? match.expiresAt.toISOString()
            : null,
        challenger: teamSummary(
          challengerTeam,
          challengerLineup,
          match.challengerPoints ?? 0
        ),
        opponent: teamSummary(
          opponentTeam,
          opponentLineup,
          match.opponentPoints ?? 0
        ),
        winnerTeamId: match.winnerTeamId ? String(match.winnerTeamId) : null,
        viewerSide,
        viewerCanManage: canManage,
        tier: 'social',
        confirmedDuels: confirmedByMatch.get(String(match._id)) ?? 0,
        totalDuels: status === 'pending' ? 0 : TEAM_FRIENDLY_DUEL_COUNT,
        captainCanModerate: friendlyMatchAllowsCaptainModeration({
          status,
          tier: match.tier ?? 'social'
        })
      }
      return row
    })
    .filter((row): row is TeamFriendlyMatchListItemDTO => row != null)
}

export async function buildTeamFriendlyMatchDetail(
  matchId: mongoose.Types.ObjectId,
  viewerUserId: string,
  viewerTeamId: string | null,
  canManage: boolean
): Promise<TeamFriendlyMatchDetailDTO | null> {
  await connectDB()

  const match = await TeamFriendlyMatch.findById(matchId).lean()
  if (!match) return null

  const [challengerTeam, opponentTeam, duels] = await Promise.all([
    Team.findById(match.challengerTeamId)
      .select('name slug logoUrl')
      .lean<LeanTeam | null>(),
    Team.findById(match.opponentTeamId)
      .select('name slug logoUrl')
      .lean<LeanTeam | null>(),
    TeamFriendlyMatchDuel.find({ matchId }).sort({ roundNumber: 1 }).lean()
  ])

  if (!challengerTeam || !opponentTeam) return null

  const userIds = new Set<string>()
  for (const slot of match.challengerLineup ?? []) {
    userIds.add(String(slot.userId))
  }
  for (const slot of match.opponentLineup ?? []) {
    userIds.add(String(slot.userId))
  }
  for (const duel of duels) {
    userIds.add(String(duel.challengerUserId))
    userIds.add(String(duel.opponentUserId))
  }

  const users = await User.find({
    _id: { $in: [...userIds].map(id => new mongoose.Types.ObjectId(id)) }
  })
    .select('name email image')
    .lean<LeanUser[]>()

  const userById = new Map(users.map(u => [String(u._id), u]))
  const challengerLineup = lineupToDto(match.challengerLineup ?? [], userById)
  const opponentLineup = lineupToDto(match.opponentLineup ?? [], userById)
  const lineupByUserId = new Map<string, FriendlyLineupPlayerDTO>()
  for (const p of [...challengerLineup, ...opponentLineup]) {
    lineupByUserId.set(p.userId, p)
  }

  const viewerSide = viewerSideForMatch(match, viewerTeamId)
  const confirmedDuels = duels.filter(d => d.status === 'confirmed').length

  const duelDtos: FriendlyDuelDTO[] = duels.map(duel => {
    const challengerPlayer = lineupByUserId.get(String(duel.challengerUserId))
    const opponentPlayer = lineupByUserId.get(String(duel.opponentUserId))
    const isChallengerPlayer = viewerUserId === String(duel.challengerUserId)
    const isOpponentPlayer = viewerUserId === String(duel.opponentUserId)
    const viewerCanReport = isChallengerPlayer || isOpponentPlayer
    const viewerReport = isChallengerPlayer
      ? (duel.challengerReport ?? null)
      : isOpponentPlayer
        ? (duel.opponentReport ?? null)
        : null

    return {
      id: String(duel._id),
      duelIndex: duel.duelIndex,
      roundNumber: duel.roundNumber,
      challengerPlayer: challengerPlayer ?? {
        userId: String(duel.challengerUserId),
        displayName: 'Jugador',
        imageUrl: null,
        slot: duel.challengerSlot
      },
      opponentPlayer: opponentPlayer ?? {
        userId: String(duel.opponentUserId),
        displayName: 'Jugador',
        imageUrl: null,
        slot: duel.opponentSlot
      },
      status: duel.status,
      winnerUserId: duel.winnerUserId ? String(duel.winnerUserId) : null,
      isDraw:
        duel.status === 'confirmed' &&
        !duel.winnerUserId &&
        duel.challengerReport === 'tie' &&
        duel.opponentReport === 'tie',
      challengerReport: duel.challengerReport ?? null,
      opponentReport: duel.opponentReport ?? null,
      viewerCanReport,
      viewerReport
    }
  })

  const status = match.status as TeamFriendlyMatchStatus

  return {
    id: String(match._id),
    status,
    statusLabel: TEAM_FRIENDLY_MATCH_STATUS_LABELS[status] ?? status,
    createdAt:
      match.createdAt instanceof Date
        ? match.createdAt.toISOString()
        : new Date().toISOString(),
    expiresAt:
      match.expiresAt instanceof Date ? match.expiresAt.toISOString() : null,
    acceptedAt:
      match.acceptedAt instanceof Date ? match.acceptedAt.toISOString() : null,
    completedAt:
      match.completedAt instanceof Date
        ? match.completedAt.toISOString()
        : null,
    pointsPerWin: match.pointsPerWin ?? 3,
    challenger: teamSummary(
      challengerTeam,
      challengerLineup,
      match.challengerPoints ?? 0
    ),
    opponent: teamSummary(
      opponentTeam,
      opponentLineup,
      match.opponentPoints ?? 0
    ),
    winnerTeamId: match.winnerTeamId ? String(match.winnerTeamId) : null,
    viewerSide,
    viewerCanManage: canManage,
    tier: 'social',
    confirmedDuels,
    totalDuels: match.status === 'pending' ? 0 : TEAM_FRIENDLY_DUEL_COUNT,
    captainCanModerate: friendlyMatchAllowsCaptainModeration({
      status,
      tier: match.tier ?? 'social'
    }),
    duels: duelDtos
  }
}
