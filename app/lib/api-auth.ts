import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import type { Session } from 'next-auth'
import Store from '@/models/Store'
import StoreMembership from '@/models/StoreMembership'
import User from '@/models/User'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import { resolveStoreRoleForUser } from '@/lib/multitenancy/session-store-hydrate'
import type { StoreMembershipRole } from '@/models/StoreMembership'

export type AdminSessionResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse }

export type StoreStaffGate =
  | {
      ok: true
      session: Session
      activeStoreOid: mongoose.Types.ObjectId
      primaryStoreOid: mongoose.Types.ObjectId | null
      storeRole: StoreMembershipRole
    }
  | { ok: false; response: NextResponse }

async function resolvePrimaryOid(): Promise<mongoose.Types.ObjectId | null> {
  await connectDB()
  return memoPrimaryTcgfamilyStoreObjectId()
}

async function legacyUserRole(
  userId: string
): Promise<'user' | 'admin' | undefined> {
  await connectDB()
  const u = await User.findById(userId).select('role').lean<{
    role?: string
  } | null>()
  return u?.role === 'admin' ? 'admin' : u?.role === 'user' ? 'user' : undefined
}

/**
 * Sesión con tienda activa y rol de staff (dueño o admin de tienda).
 */
export async function requireStoreStaffSession(): Promise<StoreStaffGate> {
  const session = await auth()
  const userId = session?.user?.id
  const rawStore = session?.user as { activeStoreId?: string } | undefined
  const aid =
    typeof rawStore?.activeStoreId === 'string' &&
    mongoose.Types.ObjectId.isValid(rawStore.activeStoreId)
      ? rawStore.activeStoreId.trim()
      : ''

  const hydrated =
    session?.user &&
    typeof (session.user as { storeRole?: unknown }).storeRole === 'string'
      ? (session.user as { storeRole: StoreMembershipRole }).storeRole
      : undefined

  if (!session || !userId || !aid) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Tienda activa no seleccionada',
          code: 'store_required'
        },
        { status: 403 }
      )
    }
  }

  let storeRole =
    hydrated === 'owner' || hydrated === 'store_admin' ? hydrated : null

  if (!storeRole) {
    const lr = await legacyUserRole(userId)
    const legacy: 'user' | 'admin' = lr ?? 'user'
    storeRole =
      (await resolveStoreRoleForUser(
        userId,
        new mongoose.Types.ObjectId(aid),
        legacy
      )) ?? null
  }

  if (!storeRole) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const primaryStoreOid = await resolvePrimaryOid()
  return {
    ok: true,
    session,
    activeStoreOid: new mongoose.Types.ObjectId(aid),
    primaryStoreOid,
    storeRole
  }
}

export async function requireStoreOwnerSession(): Promise<StoreStaffGate> {
  const gate = await requireStoreStaffSession()
  if (!gate.ok) return gate
  if (gate.storeRole !== 'owner') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }
  return gate
}

/**
 * Staff de tienda sobre `activeStoreId` — dueño del club o administrador de tienda.
 * Usado por rutas `/api/admin/**` orientadas al staff.
 */
export async function requireAdminSession(): Promise<AdminSessionResult> {
  const gate = await requireStoreStaffSession()
  if (!gate.ok) {
    const status =
      gate.response.status === 403 ? (401 as const) : gate.response.status
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status })
    }
  }
  return { ok: true, session: gate.session }
}

/** Owners (incluye usuarios legacy `admin` sólo cuando la JWT ya está sobre la tienda TCGFamily). */
export async function requireOwnerSession(): Promise<AdminSessionResult> {
  const gate = await requireStoreOwnerSession()
  if (!gate.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }
  return { ok: true, session: gate.session }
}

/** Usuario autenticado con tienda seleccionada (dashboard / eventos públicos sin ser staff). */
export async function requireSessionUserWithActiveStore(): Promise<
  | { ok: true; session: Session; activeStoreOid: mongoose.Types.ObjectId }
  | { ok: false; response: NextResponse }
> {
  const session = await auth()
  const raw = session?.user as { activeStoreId?: string } | undefined
  const aid =
    typeof raw?.activeStoreId === 'string' &&
    mongoose.Types.ObjectId.isValid(raw.activeStoreId)
      ? raw.activeStoreId.trim()
      : ''

  if (!session?.user?.id || !aid) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Tienda activa no seleccionada',
          code: 'store_required'
        },
        { status: 403 }
      )
    }
  }

  await connectDB()
  const oid = new mongoose.Types.ObjectId(aid)
  const exists = await Store.exists({ _id: oid, isActive: true })
  if (!exists) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Tienda no encontrada.' },
        { status: 400 }
      )
    }
  }

  return {
    ok: true,
    session,
    activeStoreOid: oid
  }
}

/**
 * Tienda destino al registrar correo (`storeId` en body/query o tienda activa de sesión).
 * Misma regla que GET /api/me/stores: cualquier tienda activa del sistema.
 */
export async function resolveMailRegisterStoreOid(
  session: Session,
  requestedStoreId?: string | null
): Promise<
  | { ok: true; activeStoreOid: mongoose.Types.ObjectId }
  | { ok: false; response: NextResponse }
> {
  const userId = session.user?.id
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  let targetId =
    typeof requestedStoreId === 'string' ? requestedStoreId.trim() : ''
  if (!targetId) {
    const raw = session.user as { activeStoreId?: string } | undefined
    targetId =
      typeof raw?.activeStoreId === 'string' &&
      mongoose.Types.ObjectId.isValid(raw.activeStoreId)
        ? raw.activeStoreId.trim()
        : ''
  }

  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Selecciona una tienda válida',
          code: 'store_required'
        },
        { status: 403 }
      )
    }
  }

  await connectDB()
  const oid = new mongoose.Types.ObjectId(targetId)
  const exists = await Store.exists({ _id: oid, isActive: true })
  if (!exists) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Tienda no encontrada.' },
        { status: 400 }
      )
    }
  }

  return { ok: true, activeStoreOid: oid }
}

/**
 * ¿El usuario tiene fila explícita de staff sobre la tienda? (Útil antes de crear membresías automáticas).
 */
export async function userHasExplicitStaffMembershipOnStore(
  userId: string,
  storeOid: mongoose.Types.ObjectId
): Promise<boolean> {
  await connectDB()
  return Boolean(
    await StoreMembership.exists({
      userId: new mongoose.Types.ObjectId(userId),
      storeId: storeOid
    })
  )
}
