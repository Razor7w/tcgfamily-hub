import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Cuenta',
  description:
    'Regístrate o inicia sesión en TCG Nexo para gestionar eventos, correo y mazos en tu tienda TCG.',
  path: '/auth'
})

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
