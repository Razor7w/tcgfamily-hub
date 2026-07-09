import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import { TEAM_ROLE_LABELS, type TeamRole } from '@/lib/teams/constants'
import {
  buildTeamMonthlyActivity,
  emptyTeamMonthlyActivity
} from '@/lib/teams/monthly-activity'
import type { TeamMonthlyActivityDTO } from '@/lib/teams/monthly-activity'
import {
  buildTeamMedals,
  loadTeamMedalsContext
} from '@/lib/teams/medals/build-team-medals'
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

export type TeamPublicCoreDTO = {
  id: string
  name: string
  slug: string
  bio: string
  logoUrl: string
  coverUrl: string
  memberCount: number
  roster: TeamRosterMemberDTO[]
  decklists: TeamPublicDecklistDTO[]
}

export type TeamPublicDTO = TeamPublicCoreDTO & {
  monthlyActivity: TeamMonthlyActivityDTO
  medals: TeamMedalDTO[]
}

type LeanUser = {
  _id: mongoose.Types.ObjectId
  name?: string
  email?: string
  image?: string
}

type LeanTeamDoc = {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  bio?: string
  logoUrl?: string
  coverUrl?: string
  isActive?: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

type LeanMembership = {
  userId: mongoose.Types.ObjectId
  role: TeamRole
  featuredDecklistId?: mongoose.Types.ObjectId
}

function isTeamPublicVisible(team: LeanTeamDoc): boolean {
  if (team.isActive === false) return false
  if (team.approvalStatus === 'pending' || team.approvalStatus === 'rejected') {
    return false
  }
  return true
}

async function loadTeamPublicRoster(teamId: mongoose.Types.ObjectId): Promise<{
  memberships: LeanMembership[]
  roster: TeamRosterMemberDTO[]
  decklists: TeamPublicDecklistDTO[]
  memberOids: mongoose.Types.ObjectId[]
} | null> {
  const memberships = await TeamMembership.find({
    teamId,
    status: 'active'
  })
    .sort({ role: 1, createdAt: 1 })
    .lean<LeanMembership[]>()

  const memberOids = memberships.map(m => m.userId)
  const featuredIds = memberships
    .map(m => m.featuredDecklistId)
    .filter((id): id is mongoose.Types.ObjectId => id != null)

  const [users, decklistRows] = await Promise.all([
    memberOids.length > 0
      ? User.find({ _id: { $in: memberOids } })
          .select('name email image')
          .lean<LeanUser[]>()
      : Promise.resolve([] as LeanUser[]),
    featuredIds.length > 0
      ? SavedDecklist.find({
          _id: { $in: featuredIds },
          userId: { $in: memberOids },
          isPublic: true
        })
          .select('name pokemonSlugs updatedAt userId')
          .lean()
      : Promise.resolve([])
  ])

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

  const deckByUserId = new Map<string, (typeof decklistRows)[0]>()
  for (const d of decklistRows) {
    const uid = String(d.userId)
    if (!deckByUserId.has(uid)) deckByUserId.set(uid, d)
  }

  const decklists: TeamPublicDecklistDTO[] = []
  for (const m of memberships) {
    const uid = m.userId.toString()
    const d = deckByUserId.get(uid)
    if (!d) continue
    const u = userById.get(uid)
    const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
    decklists.push({
      id: String(d._id),
      name: d.name,
      pokemonSlugs: Array.isArray(d.pokemonSlugs) ? d.pokemonSlugs : [],
      ownerId: uid,
      ownerName: displayName,
      ownerImage: imageUrl,
      updatedAt: (d.updatedAt as Date).toISOString()
    })
  }

  return { memberships, roster, decklists, memberOids }
}

export async function buildTeamPublicCorePayload(
  teamId: mongoose.Types.ObjectId,
  teamDoc?: LeanTeamDoc | null
): Promise<TeamPublicCoreDTO | null> {
  await connectDB()

  const team =
    teamDoc ?? (await Team.findById(teamId).lean<LeanTeamDoc | null>())

  if (!team || !isTeamPublicVisible(team)) return null

  const rosterData = await loadTeamPublicRoster(teamId)
  if (!rosterData) return null

  return {
    id: team._id.toString(),
    name: team.name,
    slug: team.slug,
    bio: typeof team.bio === 'string' ? team.bio : '',
    logoUrl: typeof team.logoUrl === 'string' ? team.logoUrl : '',
    coverUrl: typeof team.coverUrl === 'string' ? team.coverUrl : '',
    memberCount: rosterData.roster.length,
    roster: rosterData.roster,
    decklists: rosterData.decklists
  }
}

export async function buildTeamPublicMedals(
  teamId: mongoose.Types.ObjectId,
  options?: {
    includeLeague?: boolean
    monthlyActivity?: TeamMonthlyActivityDTO
  }
): Promise<TeamMedalDTO[]> {
  const includeLeague = options?.includeLeague === true
  const ctx = await loadTeamMedalsContext(teamId, {
    monthlyActivity: options?.monthlyActivity
  })
  if (!ctx) return []

  try {
    return await buildTeamMedals(teamId, { context: ctx, includeLeague })
  } catch (e) {
    console.error('buildTeamPublicMedals:', e)
    return []
  }
}

export async function buildTeamPublicMonthlyActivity(
  teamId: mongoose.Types.ObjectId
): Promise<TeamMonthlyActivityDTO | null> {
  await connectDB()

  const team = await Team.findById(teamId)
    .select('isActive approvalStatus')
    .lean<Pick<LeanTeamDoc, 'isActive' | 'approvalStatus'> | null>()

  if (!team || !isTeamPublicVisible(team as LeanTeamDoc)) return null

  const memberships = await TeamMembership.find({
    teamId,
    status: 'active'
  })
    .select('userId role')
    .lean<Pick<LeanMembership, 'userId' | 'role'>[]>()

  if (memberships.length === 0) return emptyTeamMonthlyActivity()

  try {
    return await buildTeamMonthlyActivity(
      memberships.map(m => m.userId),
      memberships.map(m => ({ userId: m.userId, role: m.role }))
    )
  } catch (e) {
    console.error('buildTeamPublicMonthlyActivity:', e)
    return emptyTeamMonthlyActivity()
  }
}

/** @deprecated Usar buildTeamPublicCorePayload + endpoints lazy. */
export async function buildTeamPublicPayload(
  teamId: mongoose.Types.ObjectId
): Promise<TeamPublicDTO | null> {
  const core = await buildTeamPublicCorePayload(teamId)
  if (!core) return null

  const [monthlyActivity, medals] = await Promise.all([
    buildTeamPublicMonthlyActivity(teamId),
    buildTeamPublicMedals(teamId)
  ])

  return normalizeTeamPublicDTO({
    ...core,
    monthlyActivity: monthlyActivity ?? emptyTeamMonthlyActivity(),
    medals
  })
}
