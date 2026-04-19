import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { Session } from 'next-auth'

export type AdminSessionResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse }

/**
 * Sesión requerida con rol **admin**. Misma respuesta que el resto de rutas admin:
 * `401` con `{ error: 'No autorizado' }` si no hay sesión o no es admin.
 */
export async function requireAdminSession(): Promise<AdminSessionResult> {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }
  return { ok: true, session }
}
