import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { TEAM_ROLE_LABELS } from '@/lib/teams/constants'
import {
  canManageTeam,
  getMembershipForUserOnTeam,
  getApprovedTeamBySlug,
  isCaptain
} from '@/lib/teams/access'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import {
  buildTeamMedals,
  mergeTeamMedals
} from '@/lib/teams/medals/build-team-medals'
import { getCachedTeamLeagueMedals } from '@/lib/teams/public-cache'
import type { TeamMedalDTO } from '@/lib/teams/medals/types'
import { formatRutOnBlur } from '@/lib/rut-input'
import TeamInvitation from '@/models/TeamInvitation'
import TeamMembership from '@/models/TeamMembership'
import User from '@/models/User'

export type TeamManageMemberDTO = {
  userId: string
  displayName: string
  imageUrl: string | null
  role: 'captain' | 'co_captain' | 'member'
  roleLabel: string
}

export type TeamManageInvitationDTO = {
  id: string
  inviteeUserId: string | null
  inviteeName: string
  inviteeImage: string | null
  inviteePopid: string
  inviteeRut: string
  linkStatus: 'linked' | 'awaiting_user'
  expiresAt: string
  createdAt: string
}

export type TeamManageCoreDTO = {
  team: {
    id: string
    name: string
    slug: string
    bio: string
    logoUrl: string
    logoKey: string
    coverUrl: string
    coverKey: string
  }
  viewer: {
    userId: string
    role: 'captain' | 'co_captain' | 'member'
    roleLabel: string
    canManage: boolean
    isCaptain: boolean
    featuredDecklistId: string | null
  }
  members: TeamManageMemberDTO[]
  memberCount: number
}

type TeamManageAccess =
  | {
      ok: true
      team: Awaited<ReturnType<typeof getApprovedTeamBySlug>> & object
      teamOid: mongoose.Types.ObjectId
      viewerMembership: NonNullable<
        Awaited<ReturnType<typeof getMembershipForUserOnTeam>>
      >
    }
  | { ok: false; status: 404 | 403; error: string }

export async function requireTeamManageAccess(
  slug: string,
  userId: string
): Promise<TeamManageAccess> {
  const normalized = slug.trim().toLowerCase()
  const team = await getApprovedTeamBySlug(normalized)
  if (!team) {
    return { ok: false, status: 404, error: 'Equipo no encontrado' }
  }

  const teamOid = team._id as mongoose.Types.ObjectId
  const viewerMembership = await getMembershipForUserOnTeam(userId, teamOid)
  if (!viewerMembership) {
    return { ok: false, status: 403, error: 'No autorizado' }
  }

  return { ok: true, team, teamOid, viewerMembership }
}

export async function loadTeamManageMembers(
  teamOid: mongoose.Types.ObjectId
): Promise<TeamManageMemberDTO[]> {
  await connectDB()
  const memberships = await TeamMembership.find({
    teamId: teamOid,
    status: 'active'
  })
    .sort({ role: 1, createdAt: 1 })
    .lean()

  const userIds = memberships.map(m => m.userId)
  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('name email image')
          .lean<
            {
              _id: mongoose.Types.ObjectId
              name?: string
              email?: string
              image?: string
            }[]
          >()
      : []

  const userById = new Map(users.map(u => [String(u._id), u]))

  return memberships.map(m => {
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
}

export async function loadTeamManageInvitations(
  teamOid: mongoose.Types.ObjectId
): Promise<TeamManageInvitationDTO[]> {
  await connectDB()
  const rows = await TeamInvitation.find({
    teamId: teamOid,
    status: { $in: ['pending', 'awaiting_user'] },
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .lean()

  const inviteeIds = rows
    .map(r => r.inviteeUserId)
    .filter((id): id is mongoose.Types.ObjectId => id != null)
    .map(id => new mongoose.Types.ObjectId(String(id)))

  const invitees =
    inviteeIds.length > 0
      ? await User.find({ _id: { $in: inviteeIds } })
          .select('name email image popid rut')
          .lean<
            {
              _id: mongoose.Types.ObjectId
              name?: string
              email?: string
              image?: string
              popid?: string
              rut?: string
            }[]
          >()
      : []

  const inviteeById = new Map(
    invitees.map(u => {
      const { displayName, imageUrl } = ownerPublicDisplay(u)
      return [
        String(u._id),
        {
          displayName,
          imageUrl,
          popid: typeof u.popid === 'string' ? u.popid.trim() : '',
          rut: typeof u.rut === 'string' ? u.rut.trim() : ''
        }
      ]
    })
  )

  return rows.map(r => {
    const uid = r.inviteeUserId ? String(r.inviteeUserId) : ''
    const u = uid ? inviteeById.get(uid) : undefined
    const storedRut =
      typeof r.inviteeRut === 'string' && r.inviteeRut.trim()
        ? r.inviteeRut.trim()
        : (u?.rut ?? '')
    return {
      id: String(r._id),
      inviteeUserId: uid || null,
      inviteeName: u?.displayName ?? 'Jugador',
      inviteeImage: u?.imageUrl ?? null,
      inviteePopid: u?.popid ?? '',
      inviteeRut: formatRutOnBlur(storedRut) || storedRut,
      linkStatus:
        r.status === 'awaiting_user'
          ? ('awaiting_user' as const)
          : ('linked' as const),
      expiresAt: (r.expiresAt as Date).toISOString(),
      createdAt: r.createdAt.toISOString()
    }
  })
}

export async function loadTeamManageMedals(
  teamOid: mongoose.Types.ObjectId
): Promise<TeamMedalDTO[]> {
  try {
    const [baseMedals, leagueMedals] = await Promise.all([
      buildTeamMedals(teamOid, { includeLeague: false }),
      getCachedTeamLeagueMedals(teamOid)
    ])
    return mergeTeamMedals(leagueMedals, baseMedals)
  } catch (medalErr) {
    console.error('loadTeamManageMedals:', medalErr)
    return []
  }
}

export async function buildTeamManageCore(input: {
  team: NonNullable<Awaited<ReturnType<typeof getApprovedTeamBySlug>>>
  teamOid: mongoose.Types.ObjectId
  viewerUserId: string
  viewerMembership: NonNullable<
    Awaited<ReturnType<typeof getMembershipForUserOnTeam>>
  >
}): Promise<TeamManageCoreDTO> {
  const members = await loadTeamManageMembers(input.teamOid)

  return {
    team: {
      id: String(input.team._id),
      name: input.team.name,
      slug: input.team.slug,
      bio: input.team.bio ?? '',
      logoUrl: input.team.logoUrl ?? '',
      logoKey: input.team.logoKey ?? '',
      coverUrl: input.team.coverUrl ?? '',
      coverKey: input.team.coverKey ?? ''
    },
    viewer: {
      userId: input.viewerUserId,
      role: input.viewerMembership.role,
      roleLabel: TEAM_ROLE_LABELS[input.viewerMembership.role],
      canManage: canManageTeam(input.viewerMembership.role),
      isCaptain: isCaptain(input.viewerMembership.role),
      featuredDecklistId: input.viewerMembership.featuredDecklistId
        ? String(input.viewerMembership.featuredDecklistId)
        : null
    },
    members,
    memberCount: members.length
  }
}
