'use client'

import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'

export default function AdminLigasLayout({
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
