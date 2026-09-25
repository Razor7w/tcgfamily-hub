'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

export type MyTournamentPointsCoupon = {
  id: string
  code: string
  points: number
  reason: string
  createdAt: string
  expiresAt: string
  validForHours: number
}

export type MyTournamentPointsCouponsData = {
  enabled: boolean
  coupons: MyTournamentPointsCoupon[]
}

export function useMyTournamentPointsCoupons(options?: { enabled?: boolean }) {
  const want = options?.enabled !== false
  const { data: session, status } = useSession()
  const activeStoreId =
    typeof (session?.user as { activeStoreId?: string } | undefined)
      ?.activeStoreId === 'string'
      ? (session?.user as { activeStoreId: string }).activeStoreId
      : undefined

  return useQuery<MyTournamentPointsCouponsData>({
    queryKey: ['me', 'tournament-points', 'coupons', activeStoreId ?? 'none'],
    queryFn: async () => {
      const res = await fetch('/api/me/tournament-points/coupons')
      if (!res.ok) {
        throw new Error('No se pudieron cargar los cupones')
      }
      return res.json() as Promise<MyTournamentPointsCouponsData>
    },
    enabled: want && status === 'authenticated' && Boolean(activeStoreId),
    staleTime: 60_000
  })
}
