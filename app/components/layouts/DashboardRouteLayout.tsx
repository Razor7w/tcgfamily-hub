import { Suspense } from 'react'
import { auth } from '@/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import Header from '@/components/Header'
import SidebarLayout from '@/components/layouts/SidebarLayout'
import DashboardSidebar from '@/components/navigation/DashboardSidebar'
import PointerBlockerDiagnostics from '@/components/debug/PointerBlockerDiagnostics'
import ProductTourRouteCleanup from '@/components/tour/ProductTourRouteCleanup'
import { DashboardModulesProvider } from '@/contexts/DashboardModulesContext'
import { loadDashboardModuleSettings } from '@/lib/load-dashboard-module-settings'

export default async function DashboardRouteLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const activeStoreMongoId =
    typeof session?.user.activeStoreId === 'string'
      ? session.user.activeStoreId
      : null
  const isAdmin =
    session?.user.storeRole === 'owner' ||
    session?.user.storeRole === 'store_admin'
  const isOwner = session?.user.storeRole === 'owner'
  const dashboardModules = await loadDashboardModuleSettings(activeStoreMongoId)

  return (
    <AuthLayout>
      <Header />

      <DashboardModulesProvider settings={dashboardModules}>
        <ProductTourRouteCleanup />
        <Suspense fallback={null}>
          <PointerBlockerDiagnostics />
        </Suspense>
        <SidebarLayout
          sidebar={<DashboardSidebar isAdmin={isAdmin} isOwner={isOwner} />}
        >
          {children}
        </SidebarLayout>
      </DashboardModulesProvider>
    </AuthLayout>
  )
}
