'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useMeStores } from '@/hooks/useMeStores'

/**
 * URL del hub de la tienda activa (`/{slug}`), alineado con el header.
 * Fallback `/dashboard/tiendas` si no hay sesión, tienda activa o slug resoluble.
 */
export function useStoreHubHref(): string {
  const { data: session, status } = useSession()
  const { data: meStores } = useMeStores()
  const activeId =
    typeof session?.user?.activeStoreId === 'string'
      ? session.user.activeStoreId.trim()
      : ''

  const syncHref = useMemo(() => {
    if (status !== 'authenticated') return '/dashboard/tiendas'
    if (!activeId) return '/dashboard/tiendas'
    return null
  }, [status, activeId])

  const fromList = useMemo(() => {
    if (syncHref !== null) return null
    const rows = meStores?.stores ?? []
    const hit = rows.find(r => String(r.id ?? '').trim() === activeId)
    const raw = typeof hit?.slug === 'string' ? hit.slug.trim() : ''
    const slug = raw.toLowerCase()
    if (!slug) return '/dashboard/tiendas'
    return `/${encodeURIComponent(slug)}`
  }, [syncHref, activeId, meStores?.stores])

  return syncHref ?? fromList ?? '/dashboard/tiendas'
}
