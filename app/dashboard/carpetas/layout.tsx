import { redirect } from 'next/navigation'
import { sessionHasSellerModuleAccess } from '@/lib/seller-module-access'

export default async function CarpetasDashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  if (!(await sessionHasSellerModuleAccess())) {
    redirect('/dashboard')
  }
  return children
}
