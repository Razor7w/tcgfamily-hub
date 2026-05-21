import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Error al iniciar sesión',
  description:
    'No se pudo completar el inicio de sesión con Google u otro proveedor.',
  path: '/auth/error',
  noIndex: true
})

export default function AuthErrorLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
