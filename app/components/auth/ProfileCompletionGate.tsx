'use client'

import { useSession } from 'next-auth/react'
import OAuthOnboardingModal from '@/components/auth/OAuthOnboardingModal'

function needsRutCompletion(rut: string | undefined) {
  return !rut?.trim()
}

export default function ProfileCompletionGate() {
  const { data: session, status, update } = useSession()

  // OAuth sin contraseña: solo mostrar si falta RUT en la sesión (viene de la BD al loguear).
  // No usar localStorage: falla entre subdominios/dispositivos y el RUT ya guardado no lo refleja.
  const open =
    status === 'authenticated' &&
    session?.user &&
    !session.user.hasPassword &&
    needsRutCompletion(session.user.rut)

  async function handleComplete(data: { rut: string; popid: string }) {
    await update({
      rut: data.rut,
      popid: data.popid
    })
  }

  if (!open) return null

  return (
    <OAuthOnboardingModal
      open
      onComplete={handleComplete}
      initialRut={session.user.rut}
      initialPopid={session.user.popid}
    />
  )
}
