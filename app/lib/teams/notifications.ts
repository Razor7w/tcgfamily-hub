import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import Team from '@/models/Team'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'
import TeamInvitation from '@/models/TeamInvitation'
import TeamMembership from '@/models/TeamMembership'
import User from '@/models/User'

export type TeamInvitationNotification = {
  id: string
  kind: 'team_invitation'
  teamId: string
  teamName: string
  teamSlug: string
  teamLogoUrl: string
  invitedByUserId: string
  invitedByName: string
  invitedByImage: string | null
  createdAt: string
  expiresAt: string
  invitationId: string
}

export type TeamFriendlyMatchNotification = {
  id: string
  kind: 'team_friendly_match'
  matchId: string
  challengerTeamId: string
  challengerTeamName: string
  challengerTeamSlug: string
  challengerTeamLogoUrl: string
  opponentTeamId: string
  opponentTeamSlug: string
  requestedByName: string
  requestedByImage: string | null
  createdAt: string
  expiresAt: string
}

export type NotificationItem =
  | TeamInvitationNotification
  | TeamFriendlyMatchNotification

export type NotificationsPayload = {
  unreadCount: number
  items: NotificationItem[]
}

export async function buildUserNotifications(
  userId: string
): Promise<NotificationsPayload> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { unreadCount: 0, items: [] }
  }

  await connectDB()
  const uid = new mongoose.Types.ObjectId(userId)

  const pending = await TeamInvitation.find({
    inviteeUserId: uid,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()

  const teamIds =
    pending.length > 0
      ? [...new Set(pending.map(i => String(i.teamId)))].map(
          id => new mongoose.Types.ObjectId(id)
        )
      : []
  const inviterIds =
    pending.length > 0
      ? [...new Set(pending.map(i => String(i.invitedByUserId)))].map(
          id => new mongoose.Types.ObjectId(id)
        )
      : []

  const [teams, inviters, friendlyItems] = await Promise.all([
    teamIds.length > 0
      ? Team.find({ _id: { $in: teamIds }, isActive: true })
          .select('name slug logoUrl')
          .lean()
      : Promise.resolve([]),
    inviterIds.length > 0
      ? User.find({ _id: { $in: inviterIds } })
          .select('name email image')
          .lean<
            {
              _id: mongoose.Types.ObjectId
              name?: string
              email?: string
              image?: string
            }[]
          >()
      : Promise.resolve([]),
    buildFriendlyMatchNotifications(userId)
  ])

  const teamById = new Map(teams.map(t => [String(t._id), t]))
  const inviterById = new Map(
    inviters.map(u => {
      const { displayName, imageUrl } = ownerPublicDisplay(u)
      return [String(u._id), { displayName, imageUrl }]
    })
  )

  const items: NotificationItem[] = []
  for (const inv of pending) {
    const team = teamById.get(String(inv.teamId))
    if (!team) continue
    const inviter = inviterById.get(String(inv.invitedByUserId))
    items.push({
      id: `team_invitation:${String(inv._id)}`,
      kind: 'team_invitation',
      teamId: String(inv.teamId),
      teamName: team.name,
      teamSlug: team.slug,
      teamLogoUrl: typeof team.logoUrl === 'string' ? team.logoUrl : '',
      invitedByUserId: String(inv.invitedByUserId),
      invitedByName: inviter?.displayName ?? 'Un capitán',
      invitedByImage: inviter?.imageUrl ?? null,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
      invitationId: String(inv._id)
    })
  }

  items.push(...friendlyItems)
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return {
    unreadCount: items.length,
    items
  }
}

async function buildFriendlyMatchNotifications(
  userId: string
): Promise<TeamFriendlyMatchNotification[]> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return []

  const uid = new mongoose.Types.ObjectId(userId)
  const memberships = await TeamMembership.find({
    userId: uid,
    status: 'active',
    role: { $in: ['captain', 'co_captain'] }
  })
    .select('teamId')
    .lean<{ teamId: mongoose.Types.ObjectId }[]>()

  if (memberships.length === 0) return []

  const teamIds = memberships.map(m => m.teamId)
  const pending = await TeamFriendlyMatch.find({
    opponentTeamId: { $in: teamIds },
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  if (pending.length === 0) return []

  const challengerTeamIds = [
    ...new Set(pending.map(m => String(m.challengerTeamId)))
  ].map(id => new mongoose.Types.ObjectId(id))
  const requesterIds = [
    ...new Set(pending.map(m => String(m.requestedByUserId)))
  ].map(id => new mongoose.Types.ObjectId(id))

  const [teams, requesters, opponentTeams] = await Promise.all([
    Team.find({ _id: { $in: challengerTeamIds } })
      .select('name slug logoUrl')
      .lean(),
    User.find({ _id: { $in: requesterIds } })
      .select('name email image')
      .lean<
        {
          _id: mongoose.Types.ObjectId
          name?: string
          email?: string
          image?: string
        }[]
      >(),
    Team.find({ _id: { $in: teamIds } })
      .select('slug')
      .lean<{ _id: mongoose.Types.ObjectId; slug: string }[]>()
  ])

  const teamById = new Map(teams.map(t => [String(t._id), t]))
  const requesterById = new Map(
    requesters.map(u => {
      const { displayName, imageUrl } = ownerPublicDisplay(u)
      return [String(u._id), { displayName, imageUrl }]
    })
  )
  const opponentSlugById = new Map(
    opponentTeams.map(t => [String(t._id), t.slug])
  )

  const items: TeamFriendlyMatchNotification[] = []
  for (const match of pending) {
    const challenger = teamById.get(String(match.challengerTeamId))
    if (!challenger) continue
    const requester = requesterById.get(String(match.requestedByUserId))
    const opponentSlug =
      opponentSlugById.get(String(match.opponentTeamId)) ?? ''

    items.push({
      id: `team_friendly_match:${String(match._id)}`,
      kind: 'team_friendly_match',
      matchId: String(match._id),
      challengerTeamId: String(match.challengerTeamId),
      challengerTeamName: challenger.name,
      challengerTeamSlug: challenger.slug,
      challengerTeamLogoUrl:
        typeof challenger.logoUrl === 'string' ? challenger.logoUrl : '',
      opponentTeamId: String(match.opponentTeamId),
      opponentTeamSlug: opponentSlug,
      requestedByName: requester?.displayName ?? 'Un capitán',
      requestedByImage: requester?.imageUrl ?? null,
      createdAt:
        match.createdAt instanceof Date
          ? match.createdAt.toISOString()
          : new Date().toISOString(),
      expiresAt:
        match.expiresAt instanceof Date
          ? match.expiresAt.toISOString()
          : new Date().toISOString()
    })
  }

  return items
}
