'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  isMustChangePasswordPath,
  MUST_CHANGE_PASSWORD_PATH,
  sessionRequiresPasswordChange
} from '@/lib/must-change-password-path'

/**
 * Redirige a la página dedicada de cambio de contraseña (sin modal ni layout del dashboard).
 */
export default function MustChangePasswordRedirect() {
  const { data: session, status } = useSession()
  const pathname = usePathname() ?? ''
  const router = useRouter()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (isMustChangePasswordPath(pathname)) return
    if (!sessionRequiresPasswordChange(session)) return
    router.replace(MUST_CHANGE_PASSWORD_PATH)
  }, [status, session, pathname, router])

  return null
}
