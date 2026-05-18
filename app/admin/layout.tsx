import type { Metadata } from 'next'
import { auth } from '@/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import Header from '@/components/Header'
import SidebarLayout from '@/components/layouts/SidebarLayout'
import DashboardSidebar from '@/components/navigation/DashboardSidebar'
import { DashboardModulesProvider } from '@/contexts/DashboardModulesContext'
import { loadDashboardModuleSettings } from '@/lib/load-dashboard-module-settings'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Administración',
  description:
    'Panel de administración de tienda: eventos, ligas, correo, puntos y configuración.',
  path: '/admin',
  noIndex: true
})

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const activeStoreMongoId =
    typeof session?.user.activeStoreId === 'string'
      ? session.user.activeStoreId
      : null
  const dashboardModules = await loadDashboardModuleSettings(activeStoreMongoId)

  const isOwner = session?.user.storeRole === 'owner'

  return (
    <AuthLayout role="admin">
      <Header />
      <DashboardModulesProvider settings={dashboardModules}>
        <SidebarLayout
          sidebar={<DashboardSidebar isAdmin={true} isOwner={isOwner} />}
        >
          {children}
        </SidebarLayout>
      </DashboardModulesProvider>
    </AuthLayout>
  )
}
