import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import { MUST_CHANGE_PASSWORD_PATH } from '@/lib/must-change-password-path'

export const metadata: Metadata = buildPageMetadata({
  title: 'Cambiar contraseña',
  description:
    'Define una contraseña nueva tras un restablecimiento temporal de tu cuenta TCG Nexo.',
  path: MUST_CHANGE_PASSWORD_PATH,
  noIndex: true
})

/** Sin Header ni menú: solo el formulario. */
export default function CambiarContrasenaLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
