'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { MyContributionPointsData } from '@/lib/contribution-points-public'

export type {
  MyContributionPointsData,
  MyContributionPointsEntry,
  ContributionPointsAwardedItem
} from '@/lib/contribution-points-public'

export function useMyContributionPoints(options?: { enabled?: boolean }) {
  const want = options?.enabled !== false
  const { data: session, status } = useSession()
  const activeStoreId =
    typeof (session?.user as { activeStoreId?: string } | undefined)
      ?.activeStoreId === 'string'
      ? (session?.user as { activeStoreId: string }).activeStoreId
      : undefined

  return useQuery<MyContributionPointsData>({
    queryKey: ['me', 'contribution-points', activeStoreId ?? 'none'],
    queryFn: async () => {
      const res = await fetch('/api/me/contribution-points')
      if (!res.ok) {
        throw new Error('No se pudieron cargar los puntos de contribución')
      }
      return res.json() as Promise<MyContributionPointsData>
    },
    enabled: want && status === 'authenticated' && Boolean(activeStoreId),
    staleTime: 60_000
  })
}
