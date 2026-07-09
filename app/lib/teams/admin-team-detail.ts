import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import { TEAM_POST_NOT_DELETED_FILTER } from '@/lib/teams/post-constants'
import {
  TEAM_ROLE_LABELS,
  type TeamApprovalStatus
} from '@/lib/teams/constants'
import { adminTeamDisplayStatus } from '@/lib/teams/approval-workflow-display'
import { buildTeamMedals } from '@/lib/teams/medals/build-team-medals'
import type {
  AdminTeamDetailDTO,
  AdminTeamMemberDTO
} from '@/lib/teams/admin-team-detail-types'
import { buildTeamPostDTOs } from '@/lib/teams/post-payload'
import Team from '@/models/Team'
import TeamMembership from '@/models/TeamMembership'
import TeamPost from '@/models/TeamPost'
import User from '@/models/User'

export type {
  AdminTeamDetailDTO,
  AdminTeamMemberDTO
} from '@/lib/teams/admin-team-detail-types'

export async function buildAdminTeamDetail(
  teamId: mongoose.Types.ObjectId
): Promise<AdminTeamDetailDTO | null> {
  await connectDB()

  const team = await Team.findById(teamId).lean<{
    _id: mongoose.Types.ObjectId
    name: string
    slug: string
    bio?: string
    logoUrl?: string
    coverUrl?: string
    captainUserId: mongoose.Types.ObjectId
    approvalStatus: TeamApprovalStatus
    isActive?: boolean
    rejectionReason?: string
    createdAt: Date
    reviewedAt?: Date
  } | null>()

  if (!team) return null

  const captainUser = await User.findById(team.captainUserId)
    .select('name email image popid rut')
    .lean<{
      _id: mongoose.Types.ObjectId
      name?: string
      email?: string
      image?: string
      popid?: string
      rut?: string
    } | null>()

  const captainDisplay = ownerPublicDisplay(captainUser ?? null)

  const memberships = await TeamMembership.find({
    teamId,
    status: 'active'
  })
    .sort({ role: 1, createdAt: 1 })
    .lean<
      {
        userId: mongoose.Types.ObjectId
        role: 'captain' | 'co_captain' | 'member'
      }[]
    >()

  const memberUserIds = memberships.map(m => m.userId)
  const memberUsers =
    memberUserIds.length > 0
      ? await User.find({ _id: { $in: memberUserIds } })
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
      : []

  const userById = new Map(memberUsers.map(u => [String(u._id), u]))

  const members: AdminTeamMemberDTO[] = memberships.map(m => {
    const u = userById.get(String(m.userId))
    const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
    return {
      userId: String(m.userId),
      displayName,
      imageUrl,
      email: typeof u?.email === 'string' ? u.email : '',
      popid: typeof u?.popid === 'string' ? u.popid.trim() : '',
      role: m.role,
      roleLabel: TEAM_ROLE_LABELS[m.role]
    }
  })

  const postRows = await TeamPost.find({
    teamId,
    ...TEAM_POST_NOT_DELETED_FILTER
  })
    .sort({ _id: -1 })
    .limit(50)
    .lean<
      {
        _id: mongoose.Types.ObjectId
        teamId: mongoose.Types.ObjectId
        authorUserId: mongoose.Types.ObjectId
        title: string
        bodyHtml: string
        coverUrl: string
        coverKey?: string
        visibility?: 'public' | 'members_only'
        decklistId?: mongoose.Types.ObjectId
        likeCount: number
        dislikeCount: number
        commentCount: number
        createdAt: Date
        updatedAt: Date
      }[]
    >()

  const postCount = await TeamPost.countDocuments({
    teamId,
    ...TEAM_POST_NOT_DELETED_FILTER
  })

  const posts = await buildTeamPostDTOs(postRows, null, true)

  const isActive = team.isActive !== false
  const approvalStatus = team.approvalStatus

  let medals: Awaited<ReturnType<typeof buildTeamMedals>> = []
  if (isActive && approvalStatus === 'approved') {
    try {
      medals = await buildTeamMedals(teamId)
    } catch (e) {
      console.error('buildAdminTeamDetail buildTeamMedals:', e)
    }
  }

  return {
    id: String(team._id),
    name: team.name,
    slug: team.slug,
    bio: typeof team.bio === 'string' ? team.bio : '',
    logoUrl: team.logoUrl ?? '',
    coverUrl: team.coverUrl ?? '',
    approvalStatus,
    displayStatus: adminTeamDisplayStatus({
      approvalStatus,
      isActive
    }),
    isActive,
    rejectionReason:
      typeof team.rejectionReason === 'string' ? team.rejectionReason : '',
    submittedAt:
      team.createdAt instanceof Date
        ? team.createdAt.toISOString()
        : new Date().toISOString(),
    reviewedAt:
      team.reviewedAt instanceof Date ? team.reviewedAt.toISOString() : null,
    publicPath: `/equipos/${team.slug}`,
    captain: {
      userId: String(team.captainUserId),
      displayName: captainDisplay.displayName,
      imageUrl: captainDisplay.imageUrl,
      email: typeof captainUser?.email === 'string' ? captainUser.email : '',
      popid:
        typeof captainUser?.popid === 'string' ? captainUser.popid.trim() : '',
      rut: typeof captainUser?.rut === 'string' ? captainUser.rut.trim() : ''
    },
    members,
    memberCount: members.length,
    posts,
    postCount,
    medals
  }
}
