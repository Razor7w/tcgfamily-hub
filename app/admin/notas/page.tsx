import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import AdminNotasClient from '@/admin/notas/AdminNotasClient'

export const metadata: Metadata = buildPageMetadata({
  title: 'Notas',
  description:
    'Notas de turno para el staff de TCG Family, con texto e imagen opcional.',
  path: '/admin/notas',
  noIndex: true
})

export default function AdminNotasPage() {
  return <AdminNotasClient />
}
