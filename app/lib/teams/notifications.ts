import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import Team from '@/models/Team'
import TeamInvitation from '@/models/TeamInvitation'
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

export type NotificationsPayload = {
  unreadCount: number
  items: TeamInvitationNotification[]
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

  if (pending.length === 0) {
    return { unreadCount: 0, items: [] }
  }

  const teamIds = [...new Set(pending.map(i => String(i.teamId)))].map(
    id => new mongoose.Types.ObjectId(id)
  )
  const inviterIds = [
    ...new Set(pending.map(i => String(i.invitedByUserId)))
  ].map(id => new mongoose.Types.ObjectId(id))

  const [teams, inviters] = await Promise.all([
    Team.find({ _id: { $in: teamIds }, isActive: true })
      .select('name slug logoUrl')
      .lean(),
    User.find({ _id: { $in: inviterIds } })
      .select('name email image')
      .lean<
        {
          _id: mongoose.Types.ObjectId
          name?: string
          email?: string
          image?: string
        }[]
      >()
  ])

  const teamById = new Map(teams.map(t => [String(t._id), t]))
  const inviterById = new Map(
    inviters.map(u => {
      const { displayName, imageUrl } = ownerPublicDisplay(u)
      return [String(u._id), { displayName, imageUrl }]
    })
  )

  const items: TeamInvitationNotification[] = []
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

  return {
    unreadCount: items.length,
    items
  }
}
