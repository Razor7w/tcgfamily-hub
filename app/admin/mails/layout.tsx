'use client'

import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'

export default function AdminMailsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardModuleRouteGate moduleId="mail">
      {children}
    </DashboardModuleRouteGate>
  )
}
