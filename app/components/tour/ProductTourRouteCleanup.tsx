'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cleanupOverlayBlockers } from '@/lib/overlay-blocker-cleanup'
import { useAppStore } from '@/store/useAppStore'

/** Limpia overlays y modales huérfanos al cambiar de ruta dentro del shell del dashboard. */
export default function ProductTourRouteCleanup() {
  const pathname = usePathname() ?? ''
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen)

  useLayoutEffect(() => {
    setSidebarOpen(false)
    cleanupOverlayBlockers()
  }, [pathname, setSidebarOpen])

  return null
}
