import type { Types } from 'mongoose'
import { loadDashboardAccessContext } from '@/lib/multitenancy/session-store-hydrate'

export type StoreAdminAuthContext = {
  isGlobalManager: boolean
  ownedStoreIds: Types.ObjectId[]
}

/** Una ronda: rol legacy + membresías (reutiliza `loadDashboardAccessContext`). */
export async function loadStoreAdminAuthContext(
  userId: string
): Promise<StoreAdminAuthContext> {
  const dash = await loadDashboardAccessContext(userId)
  return {
    isGlobalManager: dash.isGlobalManager,
    ownedStoreIds: dash.memberships
      .filter(m => m.role === 'owner')
      .map(m => m.storeId)
  }
}

/**
 * Quién puede actuar como “HQ” sobre **cualquier** tienda (listado completo, mutaciones
 * globales, contexto dashboard en cualquier ubicación activa).
 *
 * - `User.role === 'admin'` (legacy).
 * - **Cualquier** membresía `StoreMembership` con `role: 'owner'`.
 */
export async function canManageStoresGlobally(
  userId: string,
  options?: { adminCtx?: StoreAdminAuthContext }
): Promise<boolean> {
  if (options?.adminCtx) return options.adminCtx.isGlobalManager
  const ctx = await loadStoreAdminAuthContext(userId)
  return ctx.isGlobalManager
}

/** Stores donde el usuario es dueño (`StoreMembership`), sin filtro global. */
export async function ownedStoreIdsForUser(
  userId: string,
  options?: { adminCtx?: StoreAdminAuthContext }
): Promise<Types.ObjectId[]> {
  if (options?.adminCtx) return options.adminCtx.ownedStoreIds
  const ctx = await loadStoreAdminAuthContext(userId)
  return ctx.ownedStoreIds
}

export async function assertCanManageStoreMutation(
  actingUserId: string,
  targetStoreOid: Types.ObjectId,
  opts?: {
    globalOnlyActions?: boolean
    adminCtx?: StoreAdminAuthContext
  }
): Promise<boolean> {
  const ctx = opts?.adminCtx ?? (await loadStoreAdminAuthContext(actingUserId))
  if (ctx.isGlobalManager) return true
  if (opts?.globalOnlyActions) return false
  return ctx.ownedStoreIds.some(id => id.equals(targetStoreOid))
}

/** Alta de `owner` en una tienda: sólo quien ya tiene alcance global. */
export async function canAssignOwnerMembership(
  userId: string,
  options?: { adminCtx?: StoreAdminAuthContext }
): Promise<boolean> {
  return canManageStoresGlobally(userId, options)
}

export async function canAssignStoreAdminOnStore(
  actingUserId: string,
  targetStoreOid: Types.ObjectId,
  options?: { adminCtx?: StoreAdminAuthContext }
): Promise<boolean> {
  return assertCanManageStoreMutation(actingUserId, targetStoreOid, options)
}
