import AuthLayout from '@/components/auth/AuthLayout'
import Header from '@/components/Header'
import SidebarLayout from '@/components/layouts/SidebarLayout'
import DashboardSidebar from '@/components/navigation/DashboardSidebar'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <AuthLayout role="admin">
      <Header />
      <SidebarLayout sidebar={<DashboardSidebar isAdmin={true} />}>
        {children}
      </SidebarLayout>
    </AuthLayout>
  )
}
