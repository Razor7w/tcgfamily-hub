import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import AdminPreconClient from '@/admin/precon/AdminPreconClient'

export const metadata: Metadata = buildPageMetadata({
  title: 'Precon',
  description:
    'Inscripción de 16 jugadores y sorteo de la primera ronda de un torneo precon.',
  path: '/admin/precon',
  noIndex: true
})

export default function AdminPreconPage() {
  return <AdminPreconClient />
}
