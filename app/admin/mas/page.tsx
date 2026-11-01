import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import AdminMasClient from '@/admin/mas/AdminMasClient'

export const metadata: Metadata = buildPageMetadata({
  title: 'Más',
  description:
    'Accesos de administración: usuarios, tiendas, equipos, sugerencias, vendedores, reporte manual y torneos custom.',
  path: '/admin/mas',
  noIndex: true
})

export default function AdminMasPage() {
  return <AdminMasClient />
}
