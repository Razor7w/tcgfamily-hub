import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Team from '@/models/Team'
import TeamMembership from '@/models/TeamMembership'
import type { TeamRole } from '@/lib/teams/constants'
import { teamRoleCanManageTeam } from '@/lib/teams/constants'

export type ActiveTeamMembershipLean = {
  _id: mongoose.Types.ObjectId
  teamId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  role: TeamRole
  status: 'active'
  featuredDecklistId?: mongoose.Types.ObjectId
}

export async function getActiveMembershipForUser(
  userId: string
): Promise<ActiveTeamMembershipLean | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null
  await connectDB()
  const row = await TeamMembership.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'active'
  }).lean<ActiveTeamMembershipLean | null>()
  return row
}

export function getApprovedTeamFilter() {
  return {
    isActive: true,
    $or: [
      { approvalStatus: 'approved' as const },
      { approvalStatus: { $exists: false } }
    ]
  }
}

export async function getActiveTeamForUser(userId: string) {
  const membership = await getActiveMembershipForUser(userId)
  if (!membership) return null
  await connectDB()
  const team = await Team.findOne({
    _id: membership.teamId,
    ...getApprovedTeamFilter()
  }).lean()
  if (!team) return null
  return { team, membership }
}

export async function getApprovedTeamBySlug(slug: string) {
  await connectDB()
  return Team.findOne({
    slug: slug.trim().toLowerCase(),
    ...getApprovedTeamFilter()
  }).lean()
}

export async function getPendingTeamApplicationForUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null
  await connectDB()
  return Team.findOne({
    captainUserId: new mongoose.Types.ObjectId(userId),
    approvalStatus: 'pending'
  }).lean()
}

export async function getMembershipForUserOnTeam(
  userId: string,
  teamId: mongoose.Types.ObjectId
): Promise<ActiveTeamMembershipLean | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null
  await connectDB()
  return TeamMembership.findOne({
    teamId,
    userId: new mongoose.Types.ObjectId(userId),
    status: 'active'
  }).lean<ActiveTeamMembershipLean | null>()
}

export function canManageTeam(role: TeamRole): boolean {
  return teamRoleCanManageTeam(role)
}

export function isCaptain(role: TeamRole): boolean {
  return role === 'captain'
}

export async function countActiveMembers(
  teamId: mongoose.Types.ObjectId
): Promise<number> {
  await connectDB()
  return TeamMembership.countDocuments({ teamId, status: 'active' })
}

export async function userAlreadyInAnyTeam(userId: string): Promise<boolean> {
  const m = await getActiveMembershipForUser(userId)
  return m != null
}

export async function userCanApplyForTeam(userId: string): Promise<boolean> {
  if (await userAlreadyInAnyTeam(userId)) return false
  const pending = await getPendingTeamApplicationForUser(userId)
  return pending == null
}
