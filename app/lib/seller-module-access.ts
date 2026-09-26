import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import type { Session } from 'next-auth'

/**
 * Marcha blanca: crear/gestionar Carpetas y página de vendedor.
 * No aplica a URLs públicas (`/vendedores`, `/carpetas/...`): esas son abiertas.
 * Acceso de gestión si: `User.role === 'admin'` o `sellerModuleAccess === true`.
 */
export async function userHasSellerModuleAccess(
  userId: string
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return false
  await connectDB()
  const u = await User.findById(userId)
    .select('role sellerModuleAccess')
    .lean<{ role?: string; sellerModuleAccess?: boolean } | null>()
  if (!u) return false
  if (u.role === 'admin') return true
  return Boolean(u.sellerModuleAccess)
}

export async function requireSellerModuleSession(): Promise<
  { ok: true; session: Session } | { ok: false; response: NextResponse }
> {
  const gate = await requireSessionUser()
  if (!gate.ok) return gate
  const uid = gate.session.user?.id
  if (!uid || !(await userHasSellerModuleAccess(uid))) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Este módulo está en marcha blanca. Solo usuarios autorizados pueden usarlo.',
          code: 'SELLER_MODULE_FORBIDDEN'
        },
        { status: 403 }
      )
    }
  }
  return gate
}

/** Para layouts de página (redirect). */
export async function sessionHasSellerModuleAccess(): Promise<boolean> {
  const session = await auth()
  const uid = session?.user?.id
  if (!uid) return false
  return userHasSellerModuleAccess(uid)
}
