import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import NotificationsClient from '@/components/notifications/NotificationsClient'

export const metadata: Metadata = buildPageMetadata({
  title: 'Notificaciones',
  description: 'Solicitudes de equipo y avisos de tu cuenta.',
  path: '/dashboard/notificaciones',
  noIndex: true
})

export default function NotificacionesPage() {
  return <NotificationsClient />
}
