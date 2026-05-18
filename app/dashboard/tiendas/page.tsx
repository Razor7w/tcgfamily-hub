'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useMeStores } from '@/hooks/useMeStores'

/**
 * Puente cliente hacia el hub de la tienda activa (`/[slug]`).
 * Antes era un Server Component que solo `redirect()`; en navegación SPA eso
 * a veces dejaba el segmento sin árbol estable y disparaba errores de hooks
 * en el layout. Este componente siempre ejecuta el mismo orden de hooks.
 */
export default function DashboardTiendasBridgePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { data: meStoresPayload, isSuccess } = useMeStores()

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

    if (!isSuccess || !meStoresPayload) return

    const rows = meStoresPayload.stores ?? []
    const hit = rows.find(r => String(r.id ?? '') === aid)
    const slug = typeof hit?.slug === 'string' ? hit.slug.trim() : ''
    if (!slug) {
      router.replace('/dashboard')
      return
    }
    router.replace(`/${encodeURIComponent(slug)}`)
  }, [
    isSuccess,
    meStoresPayload,
    router,
    session?.user?.activeStoreId,
    session?.user?.id,
    status
  ])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress aria-label="Abriendo vista de tienda" />
    </Box>
  )
}
