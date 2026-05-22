import type { Session } from 'next-auth'

export const MUST_CHANGE_PASSWORD_PATH = '/auth/cambiar-contrasena'

export function sessionRequiresPasswordChange(
  session: Session | null | undefined
): boolean {
  const user = session?.user
  if (!user) return false
  return Boolean(user.hasPassword && user.mustChangePassword)
}

export function isMustChangePasswordPath(pathname: string): boolean {
  return (
    pathname === MUST_CHANGE_PASSWORD_PATH ||
    pathname.startsWith(`${MUST_CHANGE_PASSWORD_PATH}/`)
  )
}
