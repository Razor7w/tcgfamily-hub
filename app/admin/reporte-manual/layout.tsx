import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Reporte manual',
  description:
    'Asignación de sprites y decklist por owner en torneos de cualquier tienda.',
  path: '/admin/reporte-manual',
  noIndex: true
})

export default async function ReporteManualLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (session?.user?.storeRole !== 'owner') {
    redirect('/admin')
  }
  return children
}
