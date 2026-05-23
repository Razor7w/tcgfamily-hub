'use client'

import AdminStoreCreditRouteGate from '@/components/admin/AdminStoreCreditRouteGate'

export default function AdminPuntosLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <AdminStoreCreditRouteGate>{children}</AdminStoreCreditRouteGate>
}
