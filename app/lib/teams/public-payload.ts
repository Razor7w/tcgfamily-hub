import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import { TEAM_ROLE_LABELS, type TeamRole } from '@/lib/teams/constants'
import {
  buildTeamMonthlyActivity,
  emptyTeamMonthlyActivity
} from '@/lib/teams/monthly-activity'
import type { TeamMonthlyActivityDTO } from '@/lib/teams/monthly-activity'
import { buildTeamMedals } from '@/lib/teams/medals/build-team-medals'
import type { TeamMedalDTO } from '@/lib/teams/medals/types'
import { normalizeTeamPublicDTO } from '@/lib/teams/normalize-team-public'
import Team from '@/models/Team'
import TeamMembership from '@/models/TeamMembership'
import SavedDecklist from '@/models/SavedDecklist'
import User from '@/models/User'

export type TeamRosterMemberDTO = {
  userId: string
  displayName: string
  imageUrl: string | null
  role: TeamRole
  roleLabel: string
}

export type TeamPublicDecklistDTO = {
  id: string
  name: string
  pokemonSlugs: string[]
  ownerId: string
  ownerName: string
  ownerImage: string | null
  updatedAt: string
}

export type TeamPublicDTO = {
  id: string
  name: string
  slug: string
  bio: string
  logoUrl: string
  coverUrl: string
  memberCount: number
  roster: TeamRosterMemberDTO[]
  decklists: TeamPublicDecklistDTO[]
  monthlyActivity: TeamMonthlyActivityDTO
  medals: TeamMedalDTO[]
}

type LeanUser = {
  _id: mongoose.Types.ObjectId
  name?: string
  email?: string
  image?: string
}

export async function buildTeamPublicPayload(
  teamId: mongoose.Types.ObjectId
): Promise<TeamPublicDTO | null> {
  await connectDB()

  const team = await Team.findById(teamId).lean<{
    _id: mongoose.Types.ObjectId
    name: string
    slug: string
    bio?: string
    logoUrl?: string
    coverUrl?: string
    isActive?: boolean
    approvalStatus?: 'pending' | 'approved' | 'rejected'
    createdAt: Date
  } | null>()

  if (!team || team.isActive === false) return null
  if (team.approvalStatus === 'pending' || team.approvalStatus === 'rejected') {
    return null
  }

  const memberships = await TeamMembership.find({
    teamId,
    status: 'active'
  })
    .sort({ role: 1, createdAt: 1 })
    .lean<
      {
        userId: mongoose.Types.ObjectId
        role: TeamRole
        featuredDecklistId?: mongoose.Types.ObjectId
      }[]
    >()

  const memberOids = memberships.map(m => m.userId)
  const users =
    memberOids.length > 0
      ? await User.find({ _id: { $in: memberOids } })
          .select('name email image')
          .lean<LeanUser[]>()
      : []

  const userById = new Map(users.map(u => [u._id.toString(), u]))

  const roster: TeamRosterMemberDTO[] = memberships.map(m => {
    const uid = m.userId.toString()
    const u = userById.get(uid)
    const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
    return {
      userId: uid,
      displayName,
      imageUrl,
      role: m.role,
      roleLabel: TEAM_ROLE_LABELS[m.role]
    }
  })

  const featuredIds = memberships
    .map(m => m.featuredDecklistId)
    .filter((id): id is mongoose.Types.ObjectId => id != null)

  const decklists =
    featuredIds.length > 0
      ? await SavedDecklist.find({
          _id: { $in: featuredIds },
          userId: { $in: memberOids },
          isPublic: true
        })
          .select('name pokemonSlugs updatedAt userId')
          .lean()
      : []

  const deckByUserId = new Map<string, (typeof decklists)[0]>()
  for (const d of decklists) {
    const uid = String(d.userId)
    if (!deckByUserId.has(uid)) deckByUserId.set(uid, d)
  }

  const decklistDtos: TeamPublicDecklistDTO[] = []
  for (const m of memberships) {
    const uid = m.userId.toString()
    const d = deckByUserId.get(uid)
    if (!d) continue
    const u = userById.get(uid)
    const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
    decklistDtos.push({
      id: String(d._id),
      name: d.name,
      pokemonSlugs: Array.isArray(d.pokemonSlugs) ? d.pokemonSlugs : [],
      ownerId: uid,
      ownerName: displayName,
      ownerImage: imageUrl,
      updatedAt: (d.updatedAt as Date).toISOString()
    })
  }

  let monthlyActivity: TeamMonthlyActivityDTO
  try {
    monthlyActivity = await buildTeamMonthlyActivity(
      memberOids,
      memberships.map(m => ({ userId: m.userId, role: m.role }))
    )
  } catch (e) {
    console.error('buildTeamMonthlyActivity:', e)
    monthlyActivity = emptyTeamMonthlyActivity()
  }

  let medals: TeamMedalDTO[] = []
  try {
    medals = await buildTeamMedals(team._id as mongoose.Types.ObjectId, {
      teamCreatedAt: team.createdAt,
      memberCount: roster.length,
      featuredDeckMemberCount: decklistDtos.length,
      monthlyActivity
    })
  } catch (e) {
    console.error('buildTeamMedals:', e)
  }

  return normalizeTeamPublicDTO({
    id: team._id.toString(),
    name: team.name,
    slug: team.slug,
    bio: typeof team.bio === 'string' ? team.bio : '',
    logoUrl: typeof team.logoUrl === 'string' ? team.logoUrl : '',
    coverUrl: typeof team.coverUrl === 'string' ? team.coverUrl : '',
    memberCount: roster.length,
    roster,
    decklists: decklistDtos,
    monthlyActivity,
    medals
  })
}
