'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { MyTournamentPointsData } from '@/lib/tournament-points-public'

export type {
  MyTournamentPointsData,
  MyTournamentPointsEntry
} from '@/lib/tournament-points-public'

export function useMyTournamentPoints(options?: { enabled?: boolean }) {
  const want = options?.enabled !== false
  const { data: session, status } = useSession()
  const activeStoreId =
    typeof (session?.user as { activeStoreId?: string } | undefined)
      ?.activeStoreId === 'string'
      ? (session?.user as { activeStoreId: string }).activeStoreId
      : undefined

  return useQuery<MyTournamentPointsData>({
    queryKey: ['me', 'tournament-points', activeStoreId ?? 'none'],
    queryFn: async () => {
      const res = await fetch('/api/me/tournament-points')
      if (!res.ok) {
        throw new Error('No se pudieron cargar los puntos por torneo')
      }
      return res.json() as Promise<MyTournamentPointsData>
    },
    enabled: want && status === 'authenticated' && Boolean(activeStoreId),
    staleTime: 60_000
  })
}
