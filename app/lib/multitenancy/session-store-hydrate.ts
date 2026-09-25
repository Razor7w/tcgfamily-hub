import type { JWT } from 'next-auth/jwt'
import { headers } from 'next/headers'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Store from '@/models/Store'
import StoreMembership from '@/models/StoreMembership'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
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

export type DashboardAccessContext = {
  legacyRole: 'user' | 'admin'
  primaryOid: mongoose.Types.ObjectId | null
  memberships: DashboardMembershipLean
  /** Admin legacy o al menos una membresía `owner` (HQ global). */
  isGlobalManager: boolean
}

/** Una sola ronda a BD: rol legacy, tienda primaria (memo) y membresías del usuario. */
export async function loadDashboardAccessContext(
  userId: string
): Promise<DashboardAccessContext> {
  await connectDB()
  const uid = new mongoose.Types.ObjectId(userId)
  const [dbUser, primaryOid, memberships] = await Promise.all([
    User.findById(userId)
      .select('role')
      .lean<{ role?: 'user' | 'admin' } | null>(),
    memoPrimaryTcgfamilyStoreObjectId(),
    StoreMembership.find({ userId: uid })
      .select('storeId role')
      .lean<DashboardMembershipLean>()
  ])
  const legacyRole: 'user' | 'admin' =
    dbUser?.role === 'admin' ? 'admin' : 'user'
  const isGlobalManager =
    legacyRole === 'admin' || memberships.some(m => m.role === 'owner')
  return { legacyRole, primaryOid, memberships, isGlobalManager }
}

function resolveStoreRoleFromContext(
  ctx: DashboardAccessContext,
  storeOid: mongoose.Types.ObjectId,
  membershipOnStore: { role: StoreMembershipRole } | null,
  storeIsActive: boolean
): StoreMembershipRole | null {
  if (!storeIsActive) return null
  if (ctx.isGlobalManager) return 'owner'
  if (
    ctx.legacyRole === 'admin' &&
    ctx.primaryOid &&
    storeOid.equals(ctx.primaryOid)
  ) {
    return 'owner'
  }
  if (ctx.legacyRole === 'admin') return null
  return membershipOnStore?.role ?? null
}

function canActivateStoreFromContext(
  ctx: DashboardAccessContext,
  storeOid: mongoose.Types.ObjectId,
  membershipOnStore: { role: StoreMembershipRole } | null,
  storeIsActive: boolean
): boolean {
  if (!storeIsActive) return false
  if (membershipOnStore) return true
  if (
    ctx.legacyRole === 'admin' &&
    ctx.primaryOid &&
    storeOid.equals(ctx.primaryOid)
  ) {
    return true
  }
  if (ctx.isGlobalManager) return true
  const onlyStoreAdminStaff =
    ctx.memberships.length > 0 &&
    ctx.memberships.every(m => m.role === 'store_admin')
  if (onlyStoreAdminStaff && ctx.legacyRole === 'user') return true
  if (ctx.memberships.length === 0 && ctx.legacyRole === 'user') return true
  return false
}

/**
 * POST /api/me/active-store: valida acceso y rol con el mínimo de consultas (paralelas).
 * Evita repetir User, Store primaria y membresías que hacían ~2–3 s en frío.
 */
export async function resolveActiveStorePost(
  userId: string,
  storeOid: mongoose.Types.ObjectId,
  options?: { storeAlreadyVerifiedActive?: boolean }
): Promise<{ allowed: boolean; storeRole: StoreMembershipRole | null }> {
  const [ctx, storeIsActive] = await Promise.all([
    loadDashboardAccessContext(userId),
    options?.storeAlreadyVerifiedActive
      ? Promise.resolve(true)
      : (async () => {
          await connectDB()
          return Boolean(await Store.exists({ _id: storeOid, isActive: true }))
        })()
  ])

  const membershipOnStore =
    ctx.memberships.find(m => m.storeId.equals(storeOid)) ?? null

  const allowed = canActivateStoreFromContext(
    ctx,
    storeOid,
    membershipOnStore,
    storeIsActive
  )
  if (!allowed) {
    return { allowed: false, storeRole: null }
  }

  const storeRole = resolveStoreRoleFromContext(
    ctx,
    storeOid,
    membershipOnStore,
    storeIsActive
  )
  return { allowed: true, storeRole }
}

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
  storeOid: mongoose.Types.ObjectId,
  options?: { isGlobalManager?: boolean }
): Promise<boolean> {
  const m = memberships.find(x => x.storeId.equals(storeOid))
  if (m) return true
  if (legacyRole === 'admin' && primaryOid && storeOid.equals(primaryOid)) {
    return true
  }
  if (options?.isGlobalManager) {
    return Boolean(await Store.exists({ _id: storeOid, isActive: true }))
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

/** Carga contexto desde BD (p. ej. GET /api/me). */
export async function canUserActivateDashboardStore(
  userId: string,
  storeOid: mongoose.Types.ObjectId
): Promise<boolean> {
  const ctx = await loadDashboardAccessContext(userId)
  const membershipOnStore =
    ctx.memberships.find(m => m.storeId.equals(storeOid)) ?? null
  await connectDB()
  const storeIsActive = Boolean(
    await Store.exists({ _id: storeOid, isActive: true })
  )
  return canActivateStoreFromContext(
    ctx,
    storeOid,
    membershipOnStore,
    storeIsActive
  )
}

export async function resolveStoreRoleForUser(
  userId: string,
  activeStoreOid: mongoose.Types.ObjectId | null,
  legacyUserRole: 'user' | 'admin',
  preloaded?: DashboardAccessContext
): Promise<StoreMembershipRole | null> {
  if (!activeStoreOid) return null

  const ctx = preloaded ?? (await loadDashboardAccessContext(userId))
  await connectDB()
  const storeIsActive = Boolean(
    await Store.exists({ _id: activeStoreOid, isActive: true })
  )
  const membershipOnStore =
    ctx.memberships.find(m => m.storeId.equals(activeStoreOid)) ?? null

  if (legacyUserRole !== ctx.legacyRole) {
    return resolveStoreRoleFromContext(
      { ...ctx, legacyRole: legacyUserRole },
      activeStoreOid,
      membershipOnStore,
      storeIsActive
    )
  }
  return resolveStoreRoleFromContext(
    ctx,
    activeStoreOid,
    membershipOnStore,
    storeIsActive
  )
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

  const primaryOid = await memoPrimaryTcgfamilyStoreObjectId()

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

  const isGlobalManager =
    legacyRole === 'admin' || memberships.some(m => m.role === 'owner')
  const globActiveIdSet: Set<string> | null = null
  const globalAccessOpts = { isGlobalManager }

  if (activeIdStr && mongoose.Types.ObjectId.isValid(activeIdStr)) {
    const cur = new mongoose.Types.ObjectId(activeIdStr)
    const okCur = await evaluateDashboardStoreAccess(
      legacyRole,
      memberships,
      globActiveIdSet,
      primaryOid,
      cur,
      globalAccessOpts
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
      defOid,
      globalAccessOpts
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
          sid,
          globalAccessOpts
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
