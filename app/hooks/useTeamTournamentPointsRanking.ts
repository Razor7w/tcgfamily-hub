'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  TeamTournamentPointsRankingPeriod,
  TeamTournamentPointsRankingResult
} from '@/lib/teams/tournament-points-ranking'

export type TeamRankingMetric = 'tournament' | 'championship'

export type TeamRankingResult = TeamTournamentPointsRankingResult & {
  metric: TeamRankingMetric
}

export const teamTournamentPointsRankingQueryKey = [
  'teams',
  'tournament-points-ranking'
] as const

export function useTeamTournamentPointsRanking(input?: {
  period?: TeamTournamentPointsRankingPeriod
  metric?: TeamRankingMetric
  enabled?: boolean
}) {
  const period = input?.period === 'all' ? 'all' : 'month'
  const metric =
    input?.metric === 'championship' ? 'championship' : 'tournament'
  const enabled = input?.enabled ?? true

  return useQuery<TeamRankingResult>({
    queryKey: [...teamTournamentPointsRankingQueryKey, metric, period],
    queryFn: async () => {
      const qs = new URLSearchParams({ metric })
      if (metric === 'tournament') {
        qs.set('period', period)
      }
      const res = await fetch(`/api/teams/ranking?${qs.toString()}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'No se pudo cargar el ranking')
      }
      return res.json() as Promise<TeamRankingResult>
    },
    enabled,
    staleTime: 120_000
  })
}
