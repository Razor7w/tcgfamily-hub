'use client'

import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'

export default function AdminEventosLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardModuleRouteGate moduleId="weeklyEvents">
      {children}
    </DashboardModuleRouteGate>
  )
}
