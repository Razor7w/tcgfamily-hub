'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import type { DashboardModuleId } from '@/lib/dashboard-module-config'

type Props = {
  moduleId: DashboardModuleId
  children: ReactNode
}

/**
 * Redirige a /dashboard si el módulo está desactivado en la configuración del panel.
 */
export default function DashboardModuleRouteGate({
  moduleId,
  children
}: Props) {
  const router = useRouter()
  const { visibility } = useDashboardModulesFromLayout()
  const allowed = visibility[moduleId]

  useEffect(() => {
    if (!allowed) {
      router.replace('/dashboard')
    }
  }, [allowed, router])

  if (!allowed) {
    return null
  }

  return <>{children}</>
}
