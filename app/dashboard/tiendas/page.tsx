'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

/**
 * Puente cliente hacia el hub de la tienda activa (`/[slug]`).
 * Antes era un Server Component que solo `redirect()`; en navegación SPA eso
 * a veces dejaba el segmento sin árbol estable y disparaba errores de hooks
 * en el layout. Este componente siempre ejecuta el mismo orden de hooks.
 */
export default function DashboardTiendasBridgePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.id) {
      router.replace('/')
      return
    }

    const aid = session.user.activeStoreId?.trim() ?? ''
    if (!aid) {
      router.replace('/dashboard')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/me/stores')
        if (!res.ok || cancelled) {
          router.replace('/dashboard')
          return
        }
        const data = (await res.json()) as {
          stores?: Array<{ id?: string; slug?: string }>
        }
        const rows = Array.isArray(data.stores) ? data.stores : []
        const hit = rows.find(r => String(r.id ?? '') === aid)
        const slug = typeof hit?.slug === 'string' ? hit.slug.trim() : ''
        if (!slug || cancelled) {
          router.replace('/dashboard')
          return
        }
        router.replace(`/${encodeURIComponent(slug)}`)
      } catch {
        if (!cancelled) router.replace('/dashboard')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router, session?.user?.id, session?.user?.activeStoreId, status])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress aria-label="Abriendo vista de tienda" />
    </Box>
  )
}
