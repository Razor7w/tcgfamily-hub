import type { Metadata } from 'next'
import DashboardRouteLayout from '@/components/layouts/DashboardRouteLayout'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Panel',
  description:
    'Inicio del jugador: accesos rápidos, tienda activa, mazos, correo y torneos.',
  path: '/dashboard',
  noIndex: true
})

export default DashboardRouteLayout
