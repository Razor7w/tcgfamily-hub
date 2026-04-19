'use client'

import { useQuery } from '@tanstack/react-query'

export type StoreCredit = {
  storePoints: number
  storePointsExpiringNext: number
  storePointsExpiryDate: string | null
}

/** Una sola petición deduplicada (útil con React Strict Mode / re-montajes). */
export function useStoreCredit() {
  return useQuery<StoreCredit>({
    queryKey: ['me', 'store-credit'],
    queryFn: async () => {
      const res = await fetch('/api/me/store-credit')
      if (!res.ok) {
        throw new Error('No se pudieron cargar los puntos')
      }
      return res.json()
    }
  })
}
