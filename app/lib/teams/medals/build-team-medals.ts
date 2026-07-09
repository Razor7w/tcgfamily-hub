import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  buildTeamMonthlyActivity,
  emptyTeamMonthlyActivity
} from '@/lib/teams/monthly-activity'
import type { TeamMonthlyActivityDTO } from '@/lib/teams/monthly-activity'
import { buildTeamLeagueResultsForTeam } from '@/lib/teams/league-ranking'
import {
  getTeamMedalDefinition,
  TEAM_ACTIVE_MONTH_MIN_PLAYERS,
  TEAM_FULL_ROSTER_MIN_MEMBERS,
  TEAM_VETERAN_MIN_DAYS,
  teamMedalSlugForLeagueRank
} from '@/lib/teams/medals/definitions'
import type {
  TeamMedalCategory,
  TeamMedalDTO,
  TeamMedalKind,
  TeamMedalMetadata
} from '@/lib/teams/medals/types'
import type { TeamRole } from '@/lib/teams/constants'
import Team from '@/models/Team'
import TeamMedalAward from '@/models/TeamMedalAward'
import TeamMembership from '@/models/TeamMembership'
import SavedDecklist from '@/models/SavedDecklist'

export type TeamMedalsBuildContext = {
  teamCreatedAt: Date
  memberCount: number
  featuredDeckMemberCount: number
  monthlyActivity: TeamMonthlyActivityDTO
}

const CATEGORY_ORDER: Record<TeamMedalCategory, number> = {
  competitive: 0,
  community: 1,
  longevity: 2
}

function sortTeamMedals(medals: TeamMedalDTO[]): TeamMedalDTO[] {
  return [...medals].sort((a, b) => {
    const tierDiff = a.tier - b.tier
    if (tierDiff !== 0) return tierDiff
    const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
    if (categoryDiff !== 0) return categoryDiff
    return a.label.localeCompare(b.label, 'es')
  })
}

function medalFromDefinition(input: {
  slug: string
  instanceKey: string
  kind: TeamMedalKind
  earnedAt?: Date | null
  label?: string
  description?: string
  metadata?: TeamMedalDTO['metadata']
}): TeamMedalDTO | null {
  const def = getTeamMedalDefinition(input.slug)
  if (!def) return null
  return {
    slug: def.slug,
    instanceKey: input.instanceKey,
    label: input.label ?? def.label,
    description: input.description ?? def.description,
    category: def.category,
    tier: def.tier,
    kind: input.kind,
    earnedAt: input.earnedAt ? input.earnedAt.toISOString() : null,
    metadata: input.metadata
  }
}

function computeDynamicTeamMedals(
  context: TeamMedalsBuildContext,
  monthlyActivity: TeamMonthlyActivityDTO
): TeamMedalDTO[] {
  const medals: TeamMedalDTO[] = []
  const now = new Date()

  if (context.memberCount >= TEAM_FULL_ROSTER_MIN_MEMBERS) {
    const medal = medalFromDefinition({
      slug: 'full_roster',
      instanceKey: 'full_roster',
      kind: 'dynamic',
      earnedAt: now
    })
    if (medal) medals.push(medal)
  }

  if (
    context.memberCount > 0 &&
    context.featuredDeckMemberCount >= context.memberCount
  ) {
    const medal = medalFromDefinition({
      slug: 'showcase',
      instanceKey: 'showcase',
      kind: 'dynamic',
      earnedAt: now
    })
    if (medal) medals.push(medal)
  }

  const activePlayers = monthlyActivity.members.filter(
    m => m.tournamentsPlayed > 0
  ).length
  if (activePlayers >= TEAM_ACTIVE_MONTH_MIN_PLAYERS) {
    const medal = medalFromDefinition({
      slug: 'active_month',
      instanceKey: `active_month:${monthlyActivity.monthKey || 'current'}`,
      kind: 'dynamic',
      earnedAt: now,
      metadata: { monthLabel: monthlyActivity.monthLabel }
    })
    if (medal) medals.push(medal)
  }

  const ageMs = now.getTime() - context.teamCreatedAt.getTime()
  const veteranMs = TEAM_VETERAN_MIN_DAYS * 24 * 60 * 60 * 1000
  if (ageMs >= veteranMs) {
    const medal = medalFromDefinition({
      slug: 'veteran',
      instanceKey: 'veteran',
      kind: 'dynamic',
      earnedAt: context.teamCreatedAt
    })
    if (medal) medals.push(medal)
  }

  return medals
}

async function computeLeagueTeamMedals(
  teamId: mongoose.Types.ObjectId
): Promise<TeamMedalDTO[]> {
  const results = await buildTeamLeagueResultsForTeam(teamId)
  const medals: TeamMedalDTO[] = []

  for (const row of results) {
    if (row.rank < 1 || row.rank > 3) continue
    const slug = teamMedalSlugForLeagueRank(row.rank)
    if (!slug) continue

    const medal = medalFromDefinition({
      slug,
      instanceKey: `${slug}:${row.leagueId}`,
      kind: 'dynamic',
      earnedAt: new Date(),
      label: `${getTeamMedalDefinition(slug)?.label ?? slug} · ${row.leagueName}`,
      metadata: {
        leagueName: row.leagueName,
        leagueSlug: row.leagueSlug,
        rank: String(row.rank)
      }
    })
    if (medal) medals.push(medal)
  }

  return medals
}

async function loadPersistedTeamMedals(
  teamId: mongoose.Types.ObjectId
): Promise<TeamMedalDTO[]> {
  await connectDB()
  const rows = await TeamMedalAward.find({ teamId })
    .sort({ earnedAt: -1 })
    .lean<
      {
        medalSlug: string
        instanceKey: string
        label?: string
        description?: string
        metadata?: Map<string, string> | Record<string, string>
        earnedAt: Date
        seasonKey?: string
      }[]
    >()

  const medals: TeamMedalDTO[] = []
  for (const row of rows) {
    const def = getTeamMedalDefinition(row.medalSlug)
    const metadata: Record<string, string> = {}
    const rawMeta = row.metadata
    if (rawMeta instanceof Map) {
      for (const [key, value] of rawMeta.entries()) {
        metadata[key] = value
      }
    } else if (rawMeta && typeof rawMeta === 'object') {
      for (const [key, value] of Object.entries(rawMeta)) {
        if (typeof value === 'string') metadata[key] = value
      }
    }
    if (row.seasonKey) metadata.seasonKey = row.seasonKey

    medals.push({
      slug: row.medalSlug,
      instanceKey: row.instanceKey,
      label: row.label?.trim() || def?.label || row.medalSlug,
      description: row.description?.trim() || def?.description || '',
      category: def?.category ?? 'community',
      tier: def?.tier ?? 3,
      kind: 'awarded',
      earnedAt: row.earnedAt.toISOString(),
      metadata:
        Object.keys(metadata).length > 0
          ? (metadata as TeamMedalMetadata)
          : undefined
    })
  }

  return medals
}

function mergeTeamMedals(
  dynamicMedals: TeamMedalDTO[],
  persistedMedals: TeamMedalDTO[]
): TeamMedalDTO[] {
  const byKey = new Map<string, TeamMedalDTO>()

  for (const medal of dynamicMedals) {
    byKey.set(medal.instanceKey, medal)
  }

  for (const medal of persistedMedals) {
    if (!byKey.has(medal.instanceKey)) {
      byKey.set(medal.instanceKey, medal)
    }
  }

  return sortTeamMedals([...byKey.values()])
}

export async function loadTeamMedalsContext(
  teamId: mongoose.Types.ObjectId
): Promise<TeamMedalsBuildContext | null> {
  await connectDB()

  const team = await Team.findById(teamId)
    .select('createdAt isActive approvalStatus')
    .lean<{
      createdAt: Date
      isActive?: boolean
      approvalStatus?: string
    } | null>()

  if (!team || team.isActive === false) return null
  if (team.approvalStatus === 'pending' || team.approvalStatus === 'rejected') {
    return null
  }

  const memberships = await TeamMembership.find({
    teamId,
    status: 'active'
  })
    .select('userId role featuredDecklistId')
    .lean<
      {
        userId: mongoose.Types.ObjectId
        role: TeamRole
        featuredDecklistId?: mongoose.Types.ObjectId
      }[]
    >()

  const memberOids = memberships.map(m => m.userId)
  const featuredIds = memberships
    .map(m => m.featuredDecklistId)
    .filter((id): id is mongoose.Types.ObjectId => id != null)

  let featuredDeckMemberCount = 0
  if (featuredIds.length > 0 && memberOids.length > 0) {
    const publicFeatured = await SavedDecklist.find({
      _id: { $in: featuredIds },
      userId: { $in: memberOids },
      isPublic: true
    })
      .select('userId')
      .lean<{ userId: mongoose.Types.ObjectId }[]>()

    featuredDeckMemberCount = new Set(publicFeatured.map(d => String(d.userId)))
      .size
  }

  let monthlyActivity: TeamMonthlyActivityDTO
  try {
    monthlyActivity = await buildTeamMonthlyActivity(
      memberOids,
      memberships.map(m => ({ userId: m.userId, role: m.role }))
    )
  } catch (e) {
    console.error('loadTeamMedalsContext monthly activity:', e)
    monthlyActivity = emptyTeamMonthlyActivity()
  }

  return {
    teamCreatedAt: team.createdAt,
    memberCount: memberships.length,
    featuredDeckMemberCount,
    monthlyActivity
  }
}

export async function buildTeamMedals(
  teamId: mongoose.Types.ObjectId,
  context?: TeamMedalsBuildContext
): Promise<TeamMedalDTO[]> {
  const ctx = context ?? (await loadTeamMedalsContext(teamId))
  if (!ctx) return []

  const dynamic = [
    ...computeDynamicTeamMedals(ctx, ctx.monthlyActivity),
    ...(await computeLeagueTeamMedals(teamId))
  ]
  const persisted = await loadPersistedTeamMedals(teamId)

  return mergeTeamMedals(dynamic, persisted)
}
