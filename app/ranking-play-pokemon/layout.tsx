import { auth } from '@/auth'
import Header from '@/components/Header'
import SidebarLayout from '@/components/layouts/SidebarLayout'
import DashboardSidebar from '@/components/navigation/DashboardSidebar'
import ProductTourRouteCleanup from '@/components/tour/ProductTourRouteCleanup'
import { DashboardModulesProvider } from '@/contexts/DashboardModulesContext'
import { loadDashboardModuleSettings } from '@/lib/load-dashboard-module-settings'

export default async function RankingPlayPokemonLayout({
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
    <>
      <Header />
      <DashboardModulesProvider settings={dashboardModules}>
        <ProductTourRouteCleanup />
        <SidebarLayout
          sidebar={<DashboardSidebar isAdmin={isAdmin} isOwner={isOwner} />}
        >
          {children}
        </SidebarLayout>
      </DashboardModulesProvider>
    </>
  )
}
