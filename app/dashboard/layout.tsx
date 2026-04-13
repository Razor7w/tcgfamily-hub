import { auth } from '@/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import Header from '@/components/Header'
import SidebarLayout from '@/components/layouts/SidebarLayout'
import DashboardSidebar from '@/components/navigation/DashboardSidebar'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const isAdmin = session?.user.role === 'admin'

  return (
    <AuthLayout>
      <Header />

      <SidebarLayout sidebar={<DashboardSidebar isAdmin={isAdmin} />}>
        {children}
      </SidebarLayout>
    </AuthLayout>
  )
}
