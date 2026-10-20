import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import AdminPreciosClient from './AdminPreciosClient'

export const metadata: Metadata = buildPageMetadata({
  title: 'Precios',
  description:
    'Consulta y registra precios de productos por código de barras en la tienda activa.',
  path: '/admin/precios',
  noIndex: true
})

export default function AdminPreciosPage() {
  return <AdminPreciosClient />
}
