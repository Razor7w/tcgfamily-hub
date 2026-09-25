'use client'

import { useSession } from 'next-auth/react'
import OAuthOnboardingModal from '@/components/auth/OAuthOnboardingModal'

function hasDefaultStorePref(
  defaultStoreId: string | null | undefined
): boolean {
  return (
    typeof defaultStoreId === 'string' &&
    /^[a-f0-9]{24}$/i.test(defaultStoreId.trim())
  )
}

export default function ProfileCompletionGate() {
  const { data: session, status, update } = useSession()

  // OAuth sin contraseña: solo exigir tienda de preferencia (RUT es opcional).
  const open =
    status === 'authenticated' &&
    session?.user &&
    !session.user.mustChangePassword &&
    !session.user.hasPassword &&
    !hasDefaultStorePref(session.user.defaultStoreId)

  async function handleComplete(data: {
    rut: string
    popid: string
    defaultStoreId: string
  }) {
    await update({
      rut: data.rut,
      popid: data.popid,
      defaultStoreId: data.defaultStoreId,
      activeStoreId: data.defaultStoreId
    })
  }

  if (!open) return null

  return (
    <OAuthOnboardingModal
      open
      onComplete={handleComplete}
      initialRut={session.user.rut}
      initialPopid={session.user.popid}
      initialDefaultStoreId={session.user.defaultStoreId}
    />
  )
}
