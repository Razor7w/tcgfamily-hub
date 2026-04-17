import { auth } from '@/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import Header from '@/components/Header'
import SidebarLayout from '@/components/layouts/SidebarLayout'
import DashboardSidebar from '@/components/navigation/DashboardSidebar'
import { DashboardModulesProvider } from '@/contexts/DashboardModulesContext'
import { loadDashboardModuleSettings } from '@/lib/load-dashboard-module-settings'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAdmin = session?.user.role === 'admin'
  const dashboardModules = await loadDashboardModuleSettings()

  return (
    <AuthLayout>
      <Header />

      <DashboardModulesProvider settings={dashboardModules}>
        <SidebarLayout sidebar={<DashboardSidebar isAdmin={isAdmin} />}>
          {children}
        </SidebarLayout>
      </DashboardModulesProvider>
    </AuthLayout>
  )
}
