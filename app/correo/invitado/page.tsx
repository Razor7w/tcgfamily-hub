import type { Metadata } from 'next'
import GuestMailRegisterPage from './GuestMailRegisterClient'

export const metadata: Metadata = {
  title: 'Registrar correo como invitado',
  description:
    'Registra un envío a tienda sin crear cuenta. Genera un código y compártelo con el receptor.'
}

export default function Page() {
  return <GuestMailRegisterPage />
}
