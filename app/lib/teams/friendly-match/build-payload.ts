import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import {
  TEAM_FRIENDLY_INTRAMURAL_SIDE_LABELS,
  TEAM_FRIENDLY_MATCH_STATUS_LABELS,
  friendlyDuelCount,
  isFriendlyMatchIntramural,
  resolveFriendlyLineupSize,
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
  slots: {
    userId?: mongoose.Types.ObjectId
    slot: number
    vacantSince?: Date
  }[],
  userById: Map<string, LeanUser>
): FriendlyLineupPlayerDTO[] {
  return [...slots]
    .sort((a, b) => a.slot - b.slot)
    .map(slot => {
      const vacant = slot.userId == null || slot.vacantSince != null
      if (vacant) {
        return {
          userId: null,
          displayName: 'Cupos vacante',
          imageUrl: null,
          slot: slot.slot,
          vacant: true
        }
      }
      const u = userById.get(String(slot.userId))
      const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
      return {
        userId: String(slot.userId),
        displayName,
        imageUrl,
        slot: slot.slot,
        vacant: false
      }
    })
}

function teamSummary(
  team: LeanTeam,
  lineup: FriendlyLineupPlayerDTO[],
  points: number,
  options?: { intramuralSide?: 'challenger' | 'opponent' }
): FriendlyMatchTeamSummaryDTO {
  return {
    teamId: String(team._id),
    name: options?.intramuralSide
      ? TEAM_FRIENDLY_INTRAMURAL_SIDE_LABELS[options.intramuralSide]
      : team.name,
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
    challengerLineup?: { userId?: mongoose.Types.ObjectId }[]
    opponentLineup?: { userId?: mongoose.Types.ObjectId }[]
    isIntramural?: boolean
  },
  viewerTeamId: string | null,
  viewerUserId?: string
): 'challenger' | 'opponent' | null {
  if (isFriendlyMatchIntramural(match) && viewerUserId) {
    const inChallenger = (match.challengerLineup ?? []).some(
      slot => slot.userId != null && String(slot.userId) === viewerUserId
    )
    const inOpponent = (match.opponentLineup ?? []).some(
      slot => slot.userId != null && String(slot.userId) === viewerUserId
    )
    if (inChallenger && !inOpponent) return 'challenger'
    if (inOpponent && !inChallenger) return 'opponent'
    return null
  }

  if (!viewerTeamId) return null
  if (String(match.challengerTeamId) === viewerTeamId) return 'challenger'
  if (String(match.opponentTeamId) === viewerTeamId) return 'opponent'
  return null
}

const FRIENDLY_MATCH_LIST_LIMIT = 40

export const TEAM_FRIENDLY_ACTIVE_STATUSES: TeamFriendlyMatchStatus[] = [
  'pending',
  'in_progress',
  'disputed'
]

type FriendlyMatchListOptions = {
  viewerUserId?: string
  canManage?: boolean
  statuses?: TeamFriendlyMatchStatus[]
  limit?: number
}

async function loadFriendlyMatchesForTeam(
  teamId: mongoose.Types.ObjectId,
  options?: Pick<FriendlyMatchListOptions, 'statuses' | 'limit'>
) {
  const limit = options?.limit ?? FRIENDLY_MATCH_LIST_LIMIT
  const statusFilter =
    options?.statuses && options.statuses.length > 0
      ? { status: { $in: options.statuses } }
      : {}

  const [asChallenger, asOpponent] = await Promise.all([
    TeamFriendlyMatch.find({ challengerTeamId: teamId, ...statusFilter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    TeamFriendlyMatch.find({ opponentTeamId: teamId, ...statusFilter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  ])

  const seen = new Set<string>()
  const merged = [...asChallenger, ...asOpponent]
    .filter(match => {
      const id = String(match._id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .sort((a, b) => {
      const aMs = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const bMs = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return bMs - aMs
    })
    .slice(0, limit)

  return merged
}

async function buildFriendlyMatchListFromRows(
  teamId: mongoose.Types.ObjectId,
  matches: Awaited<ReturnType<typeof loadFriendlyMatchesForTeam>>,
  viewerUserId: string,
  canManage: boolean
): Promise<TeamFriendlyMatchListItemDTO[]> {
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
      if (slot.userId) userIds.add(String(slot.userId))
    }
    for (const slot of match.opponentLineup ?? []) {
      if (slot.userId) userIds.add(String(slot.userId))
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
      total: number
    }>([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$matchId',
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      }
    ])
  ])

  const teamById = new Map(teams.map(t => [String(t._id), t]))
  const userById = new Map(users.map(u => [String(u._id), u]))
  const confirmedByMatch = new Map(
    duelCounts.map(row => [String(row._id), row.confirmed])
  )
  const totalDuelsByMatch = new Map(
    duelCounts.map(row => [String(row._id), row.total])
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
      const intramural = isFriendlyMatchIntramural(match)
      const lineupSize = resolveFriendlyLineupSize(match)
      const viewerSide = viewerSideForMatch(match, viewerTeamId, viewerUserId)

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
          match.challengerPoints ?? 0,
          intramural ? { intramuralSide: 'challenger' } : undefined
        ),
        opponent: teamSummary(
          opponentTeam,
          opponentLineup,
          match.opponentPoints ?? 0,
          intramural ? { intramuralSide: 'opponent' } : undefined
        ),
        winnerTeamId: match.winnerTeamId ? String(match.winnerTeamId) : null,
        viewerSide,
        viewerCanManage: canManage,
        tier: 'social',
        isIntramural: intramural,
        lineupSize,
        confirmedDuels: confirmedByMatch.get(String(match._id)) ?? 0,
        totalDuels:
          status === 'pending'
            ? 0
            : (totalDuelsByMatch.get(String(match._id)) ??
              friendlyDuelCount(lineupSize)),
        captainCanModerate: friendlyMatchAllowsCaptainModeration({
          status,
          tier: match.tier ?? 'social'
        })
      }
      return row
    })
    .filter((row): row is TeamFriendlyMatchListItemDTO => row != null)
}

export async function buildTeamFriendlyMatchList(
  teamId: mongoose.Types.ObjectId,
  viewerUserId: string,
  canManage: boolean
): Promise<TeamFriendlyMatchListItemDTO[]> {
  await connectDB()
  const matches = await loadFriendlyMatchesForTeam(teamId)
  return buildFriendlyMatchListFromRows(
    teamId,
    matches,
    viewerUserId,
    canManage
  )
}

export async function buildTeamPublicActiveFriendlyMatches(
  teamId: mongoose.Types.ObjectId
): Promise<TeamFriendlyMatchListItemDTO[]> {
  await connectDB()
  const matches = await loadFriendlyMatchesForTeam(teamId, {
    statuses: TEAM_FRIENDLY_ACTIVE_STATUSES,
    limit: 12
  })
  return buildFriendlyMatchListFromRows(teamId, matches, '', false)
}

export async function buildTeamPublicFriendlyMatchDetail(
  matchId: mongoose.Types.ObjectId,
  perspectiveTeamId: mongoose.Types.ObjectId
): Promise<TeamFriendlyMatchDetailDTO | null> {
  await connectDB()

  const match = await TeamFriendlyMatch.findById(matchId).lean()
  if (!match) return null

  const status = match.status as TeamFriendlyMatchStatus
  if (!TEAM_FRIENDLY_ACTIVE_STATUSES.includes(status)) return null

  const perspective = String(perspectiveTeamId)
  if (
    String(match.challengerTeamId) !== perspective &&
    String(match.opponentTeamId) !== perspective
  ) {
    return null
  }

  return buildTeamFriendlyMatchDetail(matchId, '', perspective, false)
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
    if (slot.userId) userIds.add(String(slot.userId))
  }
  for (const slot of match.opponentLineup ?? []) {
    if (slot.userId) userIds.add(String(slot.userId))
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
    if (p.userId) lineupByUserId.set(p.userId, p)
  }

  const viewerSide = viewerSideForMatch(match, viewerTeamId, viewerUserId)
  const confirmedDuels = duels.filter(d => d.status === 'confirmed').length
  const intramural = isFriendlyMatchIntramural(match)
  const lineupSize = resolveFriendlyLineupSize(match)

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
        slot: duel.challengerSlot,
        vacant: false
      },
      opponentPlayer: opponentPlayer ?? {
        userId: String(duel.opponentUserId),
        displayName: 'Jugador',
        imageUrl: null,
        slot: duel.opponentSlot,
        vacant: false
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
      match.challengerPoints ?? 0,
      intramural ? { intramuralSide: 'challenger' } : undefined
    ),
    opponent: teamSummary(
      opponentTeam,
      opponentLineup,
      match.opponentPoints ?? 0,
      intramural ? { intramuralSide: 'opponent' } : undefined
    ),
    winnerTeamId: match.winnerTeamId ? String(match.winnerTeamId) : null,
    viewerSide,
    viewerCanManage: canManage,
    tier: 'social',
    isIntramural: intramural,
    lineupSize,
    confirmedDuels,
    totalDuels: match.status === 'pending' ? 0 : duelDtos.length,
    captainCanModerate: friendlyMatchAllowsCaptainModeration({
      status,
      tier: match.tier ?? 'social'
    }),
    duels: duelDtos
  }
}
