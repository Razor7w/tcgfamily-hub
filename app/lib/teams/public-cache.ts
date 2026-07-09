import 'server-only'

import { unstable_cache } from 'next/cache'
import mongoose from 'mongoose'
import type { TeamMedalDTO } from '@/lib/teams/medals/types'
import type { TeamMonthlyActivityDTO } from '@/lib/teams/monthly-activity'
import type { TeamPublicCoreDTO } from '@/lib/teams/public-payload'
import { emptyTeamMonthlyActivity } from '@/lib/teams/monthly-activity'

function teamIdStr(teamId: mongoose.Types.ObjectId): string {
  return String(teamId)
}

export async function getCachedTeamPublicCore(
  teamId: mongoose.Types.ObjectId,
  teamDoc?: Parameters<
    typeof import('@/lib/teams/public-payload').buildTeamPublicCorePayload
  >[1]
): Promise<TeamPublicCoreDTO | null> {
  const id = teamIdStr(teamId)
  if (teamDoc) {
    const { buildTeamPublicCorePayload } =
      await import('@/lib/teams/public-payload')
    return buildTeamPublicCorePayload(teamId, teamDoc)
  }

  return unstable_cache(
    async () => {
      const { buildTeamPublicCorePayload } =
        await import('@/lib/teams/public-payload')
      return buildTeamPublicCorePayload(new mongoose.Types.ObjectId(id))
    },
    ['team-public-core', id],
    { revalidate: 120, tags: [`team-public:${id}`] }
  )()
}

export async function getCachedTeamPublicMedals(
  teamId: mongoose.Types.ObjectId,
  options?: { includeLeague?: boolean }
): Promise<TeamMedalDTO[]> {
  const id = teamIdStr(teamId)
  const includeLeague = options?.includeLeague === true

  return unstable_cache(
    async () => {
      const oid = new mongoose.Types.ObjectId(id)
      const activity =
        (await getCachedTeamPublicActivity(oid)) ?? emptyTeamMonthlyActivity()
      const { buildTeamPublicMedals } =
        await import('@/lib/teams/public-payload')
      return buildTeamPublicMedals(oid, {
        includeLeague,
        monthlyActivity: activity
      })
    },
    ['team-public-medals', id, includeLeague ? 'league' : 'fast'],
    {
      revalidate: includeLeague ? 300 : 120,
      tags: [`team-medals:${id}`]
    }
  )()
}

export async function getCachedTeamPublicActivity(
  teamId: mongoose.Types.ObjectId
): Promise<TeamMonthlyActivityDTO | null> {
  const id = teamIdStr(teamId)

  return unstable_cache(
    async () => {
      const { buildTeamPublicMonthlyActivity } =
        await import('@/lib/teams/public-payload')
      return buildTeamPublicMonthlyActivity(new mongoose.Types.ObjectId(id))
    },
    ['team-public-activity', id],
    { revalidate: 60, tags: [`team-activity:${id}`] }
  )()
}

export async function getCachedTeamLeagueMedals(
  teamId: mongoose.Types.ObjectId
): Promise<TeamMedalDTO[]> {
  const id = teamIdStr(teamId)

  return unstable_cache(
    async () => {
      const { buildTeamLeagueMedals } =
        await import('@/lib/teams/medals/build-team-medals')
      return buildTeamLeagueMedals(new mongoose.Types.ObjectId(id))
    },
    ['team-league-medals', id],
    { revalidate: 300, tags: [`team-league-medals:${id}`] }
  )()
}
