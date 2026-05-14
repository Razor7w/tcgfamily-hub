import type { JWT } from 'next-auth/jwt'
import { headers } from 'next/headers'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Store from '@/models/Store'
import StoreMembership from '@/models/StoreMembership'
import { canManageStoresGlobally } from '@/lib/store-admin-access'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { publicStoreSlugFromHeaders } from '@/lib/multitenancy/ingress-headers'
import type { StoreMembershipRole } from '@/models/StoreMembership'

async function peekIngressSlug(): Promise<string | null> {
  try {
    const h = await headers()
    return publicStoreSlugFromHeaders(h)
  } catch {
    return null
  }
}

type DashboardMembershipLean = Array<{
  storeId: mongoose.Types.ObjectId
  role: StoreMembershipRole
}>

/**
 * Reglas alineadas con GET /api/me/stores: listado = todas las tiendas activas;
 * membresía da acceso explícito; usuario sin membresías = cualquier tienda activa;
 * sólo `store_admin` (sin fila owner) = cualquier tienda activa como contexto dashboard.
 */
export async function evaluateDashboardStoreAccess(
  legacyRole: 'user' | 'admin',
  memberships: DashboardMembershipLean,
  globActiveIdSet: Set<string> | null,
  primaryOid: mongoose.Types.ObjectId | null,
  storeOid: mongoose.Types.ObjectId
): Promise<boolean> {
  const m = memberships.find(x => x.storeId.equals(storeOid))
  if (m) return true
  if (legacyRole === 'admin' && primaryOid && storeOid.equals(primaryOid)) {
    return true
  }
  if (globActiveIdSet?.has(storeOid.toString())) return true

  /**
   * Usuario con rol de staff sólo como `store_admin` en una o más tiendas: puede usar
   * cualquier tienda activa como contexto del dashboard (listado alineado con GET /api/me/stores).
   */
  const onlyStoreAdminStaff =
    memberships.length > 0 &&
    memberships.every(m => m.role === 'store_admin') &&
    globActiveIdSet === null
  if (onlyStoreAdminStaff && legacyRole === 'user') {
    const ok = await Store.exists({
      _id: storeOid,
      isActive: true
    })
    return Boolean(ok)
  }

  if (
    memberships.length === 0 &&
    legacyRole === 'user' &&
    globActiveIdSet === null
  ) {
    const ok = await Store.exists({
      _id: storeOid,
      isActive: true
    })
    return Boolean(ok)
  }
  return false
}

/** Carga contexto desde BD (p. ej. POST /api/me/active-store). */
export async function canUserActivateDashboardStore(
  userId: string,
  storeOid: mongoose.Types.ObjectId
): Promise<boolean> {
  await connectDB()
  const dbUser = await User.findById(userId).select('role').lean<{
    role?: 'user' | 'admin'
  } | null>()
  const legacyRole: 'user' | 'admin' =
    dbUser?.role === 'admin' ? 'admin' : 'user'

  const primary = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId } | null>()
  const primaryOid = primary?._id ?? null

  const memberships = await StoreMembership.find({
    userId: new mongoose.Types.ObjectId(userId)
  })
    .select('storeId role')
    .lean<DashboardMembershipLean>()

  let globActiveIdSet: Set<string> | null = null
  if (await canManageStoresGlobally(userId)) {
    const ids = await Store.find({ isActive: true })
      .select('_id')
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>()
    globActiveIdSet = new Set(ids.map(doc => doc._id.toString()))
  }

  return evaluateDashboardStoreAccess(
    legacyRole,
    memberships,
    globActiveIdSet,
    primaryOid,
    storeOid
  )
}

export async function resolveStoreRoleForUser(
  userId: string,
  activeStoreOid: mongoose.Types.ObjectId | null,
  legacyUserRole: 'user' | 'admin'
): Promise<StoreMembershipRole | null> {
  await connectDB()

  if (!activeStoreOid) return null

  /** HQ (admin legacy o dueño TCGFamily): contexto sobre cualquier tienda activa. */
  if (await canManageStoresGlobally(userId)) {
    const ok = await Store.exists({
      _id: activeStoreOid,
      isActive: true
    })
    if (ok) return 'owner'
  }

  const primary = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId } | null>()

  if (legacyUserRole === 'admin' && primary) {
    if (activeStoreOid.equals(primary._id)) {
      return 'owner'
    }
    return null
  }

  const m = await StoreMembership.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    storeId: activeStoreOid
  })
    .select('role')
    .lean<{ role: StoreMembershipRole } | null>()

  return m?.role ?? null
}

/**
 * Complementa el JWT con tienda activa y rol de staff en esa tienda (owner / store_admin).
 */
export async function hydrateStoreContextInJwt(token: JWT): Promise<void> {
  const userId = typeof token.sub === 'string' ? token.sub : ''
  if (!userId) return

  await connectDB()
  const dbUser = await User.findById(userId)
    .select('role defaultStoreId')
    .lean<{
      role?: 'user' | 'admin'
      defaultStoreId?: mongoose.Types.ObjectId | null
    } | null>()
  const legacyRole: 'user' | 'admin' =
    dbUser?.role === 'admin' ? 'admin' : 'user'

  const primary = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId } | null>()
  const primaryOid = primary?._id ?? null

  const memberships = await StoreMembership.find({
    userId: new mongoose.Types.ObjectId(userId)
  })
    .select('storeId role')
    .lean<
      Array<{ storeId: mongoose.Types.ObjectId; role: StoreMembershipRole }>
    >()

  let activeIdStr =
    typeof token.activeStoreId === 'string' ? token.activeStoreId : ''

  const legacyAdmin = legacyRole === 'admin'

  let globActiveIdSet: Set<string> | null = null
  if (await canManageStoresGlobally(userId)) {
    const ids = await Store.find({ isActive: true })
      .select('_id')
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>()
    globActiveIdSet = new Set(ids.map(doc => doc._id.toString()))
  }

  if (activeIdStr && mongoose.Types.ObjectId.isValid(activeIdStr)) {
    const cur = new mongoose.Types.ObjectId(activeIdStr)
    const okCur = await evaluateDashboardStoreAccess(
      legacyRole,
      memberships,
      globActiveIdSet,
      primaryOid,
      cur
    )
    if (!okCur) {
      activeIdStr = ''
      token.activeStoreId = undefined
    }
  } else {
    activeIdStr = ''
    token.activeStoreId = undefined
  }

  if (!activeIdStr && dbUser?.defaultStoreId) {
    const defOid = dbUser.defaultStoreId
    const okDef = await evaluateDashboardStoreAccess(
      legacyRole,
      memberships,
      globActiveIdSet,
      primaryOid,
      defOid
    )
    if (okDef) {
      activeIdStr = defOid.toString()
      token.activeStoreId = activeIdStr
    }
  }

  const ingressSlug = await peekIngressSlug()

  async function oidForSlug(
    slug: string
  ): Promise<mongoose.Types.ObjectId | null> {
    const s = await Store.findOne({
      slug: slug.trim().toLowerCase()
    })
      .select('_id')
      .lean<{ _id: mongoose.Types.ObjectId } | null>()
    return s?._id ?? null
  }

  if (!activeIdStr) {
    if (ingressSlug) {
      const sid = await oidForSlug(ingressSlug)
      if (
        sid &&
        (await evaluateDashboardStoreAccess(
          legacyRole,
          memberships,
          globActiveIdSet,
          primaryOid,
          sid
        ))
      ) {
        activeIdStr = sid.toString()
        token.activeStoreId = activeIdStr
      }
    }
  }

  if (!activeIdStr && memberships.length === 1) {
    activeIdStr = memberships[0]!.storeId.toString()
    token.activeStoreId = activeIdStr
  }

  /**
   * Staff en varias tiendas: si tiene exactamente una asignación `store_admin`,
   * esa es la tienda por defecto del dashboard (no la primaria/otra membresía).
   */
  if (!activeIdStr && memberships.length > 1) {
    const storeAdminOnly = memberships.filter(m => m.role === 'store_admin')
    let pickOid: mongoose.Types.ObjectId | null = null
    if (storeAdminOnly.length === 1) {
      pickOid = storeAdminOnly[0]!.storeId
    } else if (primaryOid) {
      const hit = memberships.find(m => m.storeId.equals(primaryOid))
      if (hit) pickOid = hit.storeId
    }
    if (!pickOid) {
      const sorted = [...memberships].sort((a, b) =>
        a.storeId.toString().localeCompare(b.storeId.toString())
      )
      pickOid = sorted[0]!.storeId
    }
    activeIdStr = pickOid.toString()
    token.activeStoreId = activeIdStr
  }

  /** Socios/dashboard abierto sin fila Membership → tienda primaria TCGFamily si existe (owner la usa como vista por defecto). */
  if (
    !activeIdStr &&
    memberships.length === 0 &&
    legacyRole === 'user' &&
    globActiveIdSet === null &&
    primaryOid &&
    (await Store.exists({ _id: primaryOid, isActive: true }))
  ) {
    activeIdStr = primaryOid.toString()
    token.activeStoreId = activeIdStr
  }

  if (!activeIdStr && legacyAdmin && primaryOid) {
    activeIdStr = primaryOid.toString()
    token.activeStoreId = activeIdStr
  }

  const activeOid = activeIdStr
    ? new mongoose.Types.ObjectId(activeIdStr)
    : null

  token.storeRole =
    activeOid === null
      ? undefined
      : ((await resolveStoreRoleForUser(userId, activeOid, legacyRole)) ??
        undefined)
}
