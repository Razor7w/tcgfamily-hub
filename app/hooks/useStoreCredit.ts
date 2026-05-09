'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

export type StoreCredit = {
  storePoints: number
  storePointsExpiringNext: number
  storePointsExpiryDate: string | null
}

/** Una sola petición deduplicada (útil con React Strict Mode / re-montajes). */
export function useStoreCredit() {
  const { data: session, status } = useSession()
  const sessUser = session?.user as { activeStoreId?: string } | undefined
  const activeStoreId =
    typeof sessUser?.activeStoreId === 'string'
      ? sessUser.activeStoreId
      : undefined

  return useQuery<StoreCredit>({
    queryKey: ['me', 'store-credit', activeStoreId ?? 'none'],
    queryFn: async () => {
      const res = await fetch('/api/me/store-credit')
      if (!res.ok) {
        throw new Error('No se pudieron cargar los puntos')
      }
      return res.json()
    },
    enabled: status === 'authenticated' && Boolean(activeStoreId)
  })
}
