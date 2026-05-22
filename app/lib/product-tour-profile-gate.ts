import type { Session } from 'next-auth'
import { sessionRequiresPasswordChange } from '@/lib/must-change-password-path'

/** Misma lógica que `ProfileCompletionGate`: no mostrar tour si falta onboarding OAuth. */
export function sessionNeedsProfileCompletion(
  session: Session | null | undefined
): boolean {
  const user = session?.user
  if (!user) return true
  if (sessionRequiresPasswordChange(session)) return true
  if (user.hasPassword) return false

  const rutOk = Boolean(user.rut?.trim())
  const defaultStoreId =
    typeof user.defaultStoreId === 'string' ? user.defaultStoreId.trim() : ''
  const storeOk = /^[a-f0-9]{24}$/i.test(defaultStoreId)

  return !rutOk || !storeOk
}
