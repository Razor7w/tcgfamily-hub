'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

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

  const [href, setHref] = useState('/dashboard/tiendas')

  useEffect(() => {
    if (status !== 'authenticated') {
      setHref('/dashboard/tiendas')
      return
    }
    if (!activeId) {
      setHref('/dashboard/tiendas')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/stores')
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          stores?: Array<{ id?: string; slug?: string }>
        }
        const rows = Array.isArray(data.stores) ? data.stores : []
        const hit = rows.find(r => String(r.id ?? '') === activeId)
        const raw = typeof hit?.slug === 'string' ? hit.slug.trim() : ''
        const slug = raw.toLowerCase()
        if (!cancelled) {
          setHref(slug ? `/${encodeURIComponent(slug)}` : '/dashboard/tiendas')
        }
      } catch {
        if (!cancelled) setHref('/dashboard/tiendas')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status, activeId])

  return href
}
