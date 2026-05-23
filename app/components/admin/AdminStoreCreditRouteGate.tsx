'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { isStoreCreditAdminMenuEnabled } from '@/lib/store-credit-admin-settings'

type Props = {
  children: ReactNode
}

/** Redirige si ninguna función de /admin/puntos está habilitada (CSV o torneo). */
export default function AdminStoreCreditRouteGate({ children }: Props) {
  const router = useRouter()
  const { storeCredit } = useDashboardModulesFromLayout()
  const allowed = isStoreCreditAdminMenuEnabled(storeCredit)

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
