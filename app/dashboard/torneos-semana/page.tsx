'use client'

import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import MyTournamentsHomeSection from '@/components/dashboard/MyTournamentsHomeSection'

export default function TorneosSemanaPage() {
  return (
    <DashboardModuleRouteGate moduleId="myTournaments">
      <MyTournamentsHomeSection showPageHeading />
    </DashboardModuleRouteGate>
  )
}
