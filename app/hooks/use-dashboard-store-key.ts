'use client'

import { useSession } from 'next-auth/react'

/**
 * Sufijo de queryKey para datos del dashboard ligados a `activeStoreId` del JWT.
 */
export function useDashboardStoreQueryKey(): string {
  const { data: session } = useSession()
  const raw = session?.user?.activeStoreId
  const id = typeof raw === 'string' ? raw.trim() : ''
  return id.length > 0 ? id : 'none'
}
