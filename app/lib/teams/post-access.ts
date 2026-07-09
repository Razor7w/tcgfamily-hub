import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { getMembershipForUserOnTeam } from '@/lib/teams/access'
import type { TeamPostVisibility } from '@/lib/teams/post-constants'
import { TEAM_POST_NOT_DELETED_FILTER } from '@/lib/teams/post-constants'
import TeamPost from '@/models/TeamPost'

type PostAccessLean = {
  _id: mongoose.Types.ObjectId
  teamId: mongoose.Types.ObjectId
  visibility?: TeamPostVisibility
}

export async function getTeamPostForInteraction(
  teamId: mongoose.Types.ObjectId,
  postId: string
): Promise<PostAccessLean | null> {
  if (!mongoose.Types.ObjectId.isValid(postId)) return null
  await connectDB()
  return TeamPost.findOne({
    _id: new mongoose.Types.ObjectId(postId),
    teamId,
    ...TEAM_POST_NOT_DELETED_FILTER
  })
    .select('_id teamId visibility')
    .lean<PostAccessLean | null>()
}

export async function userCanViewTeamPost(
  post: PostAccessLean,
  userId: string | null | undefined
): Promise<boolean> {
  if ((post.visibility ?? 'public') === 'public') return true
  if (!userId) return false
  const membership = await getMembershipForUserOnTeam(userId, post.teamId)
  return membership != null
}
