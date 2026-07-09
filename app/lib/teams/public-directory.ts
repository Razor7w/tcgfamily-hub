import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { getApprovedTeamFilter } from '@/lib/teams/access'
import Team from '@/models/Team'
import TeamMembership from '@/models/TeamMembership'

export type PublicTeamDirectoryItem = {
  id: string
  name: string
  slug: string
  bio: string
  logoUrl: string
  memberCount: number
}

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 48

export async function buildPublicTeamsDirectory(
  limit = DEFAULT_LIMIT
): Promise<PublicTeamDirectoryItem[]> {
  await connectDB()

  const safeLimit = Math.min(Math.max(1, Math.round(limit)), MAX_LIMIT)

  const teams = await Team.find(getApprovedTeamFilter())
    .sort({ updatedAt: -1 })
    .limit(safeLimit)
    .select('name slug bio logoUrl')
    .lean()

  if (teams.length === 0) return []

  const teamIds = teams.map(t => t._id as mongoose.Types.ObjectId)
  const countRows = await TeamMembership.aggregate<{
    _id: mongoose.Types.ObjectId
    count: number
  }>([
    { $match: { teamId: { $in: teamIds }, status: 'active' } },
    { $group: { _id: '$teamId', count: { $sum: 1 } } }
  ])

  const countById = new Map(countRows.map(r => [String(r._id), r.count]))

  return teams.map(t => ({
    id: String(t._id),
    name: t.name,
    slug: t.slug,
    bio: typeof t.bio === 'string' ? t.bio.trim() : '',
    logoUrl: typeof t.logoUrl === 'string' ? t.logoUrl.trim() : '',
    memberCount: countById.get(String(t._id)) ?? 0
  }))
}
