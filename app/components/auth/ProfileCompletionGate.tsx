'use client'

import { useSession } from 'next-auth/react'
import OAuthOnboardingModal from '@/components/auth/OAuthOnboardingModal'

function needsRutCompletion(rut: string | undefined) {
  return !rut?.trim()
}

export default function ProfileCompletionGate() {
  const { data: session, status, update } = useSession()

  const open =
    status === 'authenticated' &&
    session?.user &&
    needsRutCompletion(session.user.rut)

  async function handleComplete(data: { rut: string; popid: string }) {
    await update({
      rut: data.rut,
      popid: data.popid
    })
  }

  if (!open) return null

  return <OAuthOnboardingModal open onComplete={handleComplete} />
}
