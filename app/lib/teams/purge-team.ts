import 'server-only'

import { revalidateTag } from 'next/cache'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { deleteAllTeamR2Media } from '@/lib/teams/r2-cleanup'
import Team from '@/models/Team'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'
import TeamFriendlyMatchDuel from '@/models/TeamFriendlyMatchDuel'
import TeamInvitation from '@/models/TeamInvitation'
import TeamJoinRequest from '@/models/TeamJoinRequest'
import TeamMedalAward from '@/models/TeamMedalAward'
import TeamMembership from '@/models/TeamMembership'
import TeamPost from '@/models/TeamPost'
import TeamPostComment from '@/models/TeamPostComment'
import TeamPostReaction from '@/models/TeamPostReaction'

export type PurgeTeamResult = {
  posts: number
  postComments: number
  postReactions: number
  friendlyMatches: number
  friendlyDuels: number
  medalAwards: number
  invitations: number
  joinRequests: number
  memberships: number
}

function invalidateTeamPublicCache(teamId: string) {
  const profile = 'max' as const
  revalidateTag(`team-public:${teamId}`, profile)
  revalidateTag(`team-medals:${teamId}`, profile)
  revalidateTag(`team-activity:${teamId}`, profile)
  revalidateTag(`team-league-medals:${teamId}`, profile)
}

/**
 * Elimina en cascada posts, versus, medallas, invitaciones, membresías,
 * archivos R2 y el documento del equipo. El ranking de equipos es calculado
 * en lectura; al borrar el equipo deja de aparecer.
 */
export async function purgeTeamData(
  teamId: mongoose.Types.ObjectId,
  branding: { logoKey?: string | null; coverKey?: string | null }
): Promise<PurgeTeamResult> {
  await connectDB()
  const teamIdStr = teamId.toString()

  await deleteAllTeamR2Media(teamId, branding)

  const postIds = await TeamPost.find({ teamId }).distinct('_id')
  const postOidList = postIds.map(id => new mongoose.Types.ObjectId(String(id)))

  let postReactions = 0
  let postComments = 0
  if (postOidList.length > 0) {
    const [reactionsResult, commentsResult] = await Promise.all([
      TeamPostReaction.deleteMany({ postId: { $in: postOidList } }),
      TeamPostComment.deleteMany({ postId: { $in: postOidList } })
    ])
    postReactions = reactionsResult.deletedCount ?? 0
    postComments = commentsResult.deletedCount ?? 0
  }

  const postsResult = await TeamPost.deleteMany({ teamId })
  const posts = postsResult.deletedCount ?? 0

  const matchIds = await TeamFriendlyMatch.find({
    $or: [{ challengerTeamId: teamId }, { opponentTeamId: teamId }]
  }).distinct('_id')
  const matchOidList = matchIds.map(
    id => new mongoose.Types.ObjectId(String(id))
  )

  let friendlyDuels = 0
  if (matchOidList.length > 0) {
    const duelsResult = await TeamFriendlyMatchDuel.deleteMany({
      matchId: { $in: matchOidList }
    })
    friendlyDuels = duelsResult.deletedCount ?? 0
  }

  const matchesResult = await TeamFriendlyMatch.deleteMany({
    $or: [{ challengerTeamId: teamId }, { opponentTeamId: teamId }]
  })
  const friendlyMatches = matchesResult.deletedCount ?? 0

  const [
    medalsResult,
    invitationsResult,
    joinRequestsResult,
    membershipsResult
  ] = await Promise.all([
    TeamMedalAward.deleteMany({ teamId }),
    TeamInvitation.deleteMany({ teamId }),
    TeamJoinRequest.deleteMany({ teamId }),
    TeamMembership.deleteMany({ teamId })
  ])

  await Team.deleteOne({ _id: teamId })

  invalidateTeamPublicCache(teamIdStr)

  return {
    posts,
    postComments,
    postReactions,
    friendlyMatches,
    friendlyDuels,
    medalAwards: medalsResult.deletedCount ?? 0,
    invitations: invitationsResult.deletedCount ?? 0,
    joinRequests: joinRequestsResult.deletedCount ?? 0,
    memberships: membershipsResult.deletedCount ?? 0
  }
}
