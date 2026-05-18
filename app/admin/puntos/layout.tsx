'use client'

import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'

export default function AdminPuntosLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardModuleRouteGate moduleId="storePoints">
      {children}
    </DashboardModuleRouteGate>
  )
}
