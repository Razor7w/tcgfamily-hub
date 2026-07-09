'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  TeamTournamentPointsRankingPeriod,
  TeamTournamentPointsRankingResult
} from '@/lib/teams/tournament-points-ranking'

export const teamTournamentPointsRankingQueryKey = [
  'teams',
  'tournament-points-ranking'
] as const

export function useTeamTournamentPointsRanking(input?: {
  period?: TeamTournamentPointsRankingPeriod
  enabled?: boolean
}) {
  const period = input?.period === 'all' ? 'all' : 'month'
  const enabled = input?.enabled ?? true

  return useQuery<TeamTournamentPointsRankingResult>({
    queryKey: [...teamTournamentPointsRankingQueryKey, period],
    queryFn: async () => {
      const qs = new URLSearchParams({ period })
      const res = await fetch(`/api/teams/ranking?${qs.toString()}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'No se pudo cargar el ranking')
      }
      return res.json() as Promise<TeamTournamentPointsRankingResult>
    },
    enabled,
    staleTime: 120_000
  })
}
