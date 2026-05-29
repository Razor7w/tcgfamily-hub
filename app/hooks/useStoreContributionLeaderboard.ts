'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  ContributionLeaderboardPeriod,
  ContributionLeaderboardRow
} from '@/lib/contribution-points-public'

export type StoreContributionLeaderboardData = {
  enabled: boolean
  period?: ContributionLeaderboardPeriod
  periodLabel?: string
  store?: { name: string }
  rows: ContributionLeaderboardRow[]
}

export function useStoreContributionLeaderboard(input: {
  storeSlug?: string
  limit?: number
  period?: ContributionLeaderboardPeriod
  enabled?: boolean
}) {
  const slug = input.storeSlug?.trim() ?? ''
  const want = input.enabled !== false
  const period = input.period ?? 'month'

  return useQuery<StoreContributionLeaderboardData>({
    queryKey: [
      'stores',
      slug,
      'contribution-leaderboard',
      period,
      input.limit ?? 10
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('period', period)
      if (input.limit != null) params.set('limit', String(input.limit))
      const qs = params.toString()
      const res = await fetch(
        `/api/stores/${encodeURIComponent(slug)}/contribution-leaderboard${qs ? `?${qs}` : ''}`
      )
      if (!res.ok) {
        throw new Error('No se pudo cargar el ranking de contribución')
      }
      return res.json() as Promise<StoreContributionLeaderboardData>
    },
    enabled: want && slug.length > 0,
    staleTime: 120_000
  })
}
