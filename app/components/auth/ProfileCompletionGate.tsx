'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import OAuthOnboardingModal from '@/components/auth/OAuthOnboardingModal'

function needsRutCompletion(rut: string | undefined) {
  return !rut?.trim()
}

export default function ProfileCompletionGate() {
  const { data: session, status, update } = useSession()

  const [dismissedOnce, setDismissedOnce] = useState(true)

  useEffect(() => {
    // Mostrar este modal 1 sola vez por navegador para usuarios OAuth (sin password).
    // Esto permite precargar datos (si ya existen) y también editarlos.
    if (typeof window === 'undefined') return
    const key = 'tcg_oauth_profile_done'
    const done = window.localStorage.getItem(key) === '1'
    setDismissedOnce(done)
  }, [])

  const open =
    status === 'authenticated' &&
    session?.user &&
    !session.user.hasPassword &&
    !dismissedOnce

  async function handleComplete(data: { rut: string; popid: string }) {
    await update({
      rut: data.rut,
      popid: data.popid
    })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tcg_oauth_profile_done', '1')
    }
    setDismissedOnce(true)
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
