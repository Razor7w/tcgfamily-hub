'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

type AsyncHref = { activeStoreKey: string; href: string }

/**
 * URL del hub de la tienda activa (`/{slug}`), alineado con el header.
 * Fallback `/dashboard/tiendas` si no hay sesión, tienda activa o slug resoluble.
 */
export function useStoreHubHref(): string {
  const { data: session, status } = useSession()
  const activeId =
    typeof session?.user?.activeStoreId === 'string'
      ? session.user.activeStoreId.trim()
      : ''

  /** Sin fetch: valor fijo en render (no en un effect). */
  const syncHref = useMemo(() => {
    if (status !== 'authenticated') return '/dashboard/tiendas'
    if (!activeId) return '/dashboard/tiendas'
    return null
  }, [status, activeId])

  const [asyncHref, setAsyncHref] = useState<AsyncHref | null>(null)

  useEffect(() => {
    if (syncHref !== null) return

    const activeStoreKey = activeId
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/me/stores')
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          stores?: Array<{ id?: string; slug?: string }>
        }
        const rows = Array.isArray(data.stores) ? data.stores : []
        const hit = rows.find(r => String(r.id ?? '') === activeStoreKey)
        const raw = typeof hit?.slug === 'string' ? hit.slug.trim() : ''
        const slug = raw.toLowerCase()
        if (!cancelled) {
          setAsyncHref({
            activeStoreKey,
            href: slug ? `/${encodeURIComponent(slug)}` : '/dashboard/tiendas'
          })
        }
      } catch {
        if (!cancelled) {
          setAsyncHref({
            activeStoreKey,
            href: '/dashboard/tiendas'
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [syncHref, activeId])

  const fromFetch =
    asyncHref?.activeStoreKey === activeId ? asyncHref.href : null

  return syncHref ?? fromFetch ?? '/dashboard/tiendas'
}
