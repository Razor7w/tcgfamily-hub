import type { Types } from 'mongoose'
import connectDB from '@/lib/mongodb'
import StoreMembership from '@/models/StoreMembership'
import User from '@/models/User'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'

/** Admin legacy (`User.role`) o dueño explicito sobre la tienda primaria TCGFamily. */
export async function canManageStoresGlobally(userId: string): Promise<boolean> {
  await connectDB()
  const oid = userId.trim()
  const legacy = await User.findById(oid).select('role').lean<{ role?: string }>()
  if (legacy?.role === 'admin') return true

  const primary = await memoPrimaryTcgfamilyStoreObjectId()
  if (!primary) return false

  return Boolean(
    await StoreMembership.exists({
      userId: oid,
      storeId: primary,
      role: 'owner'
    })
  )
}

/** Stores donde el usuario es dueño (`StoreMembership`), sin filtro global (primaria nexo HQ). */
export async function ownedStoreIdsForUser(
  userId: string
): Promise<Types.ObjectId[]> {
  await connectDB()
  const rows = await StoreMembership.find({
    userId,
    role: 'owner'
  })
    .select('storeId')
    .lean<{ storeId: Types.ObjectId }[]>()
  return rows.map(r => r.storeId)
}

export async function assertCanManageStoreMutation(
  actingUserId: string,
  targetStoreOid: Types.ObjectId,
  opts?: { globalOnlyActions?: boolean }
): Promise<boolean> {
  await connectDB()
  if (await canManageStoresGlobally(actingUserId)) return true
  if (opts?.globalOnlyActions) return false
  return Boolean(
    await StoreMembership.exists({
      userId: actingUserId,
      storeId: targetStoreOid,
      role: 'owner'
    })
  )
}

/** Alta de `owner` en una tienda: sólo plaza global / HQ (evita que un dueño de filial nomine otros dueños globales fuera de su ámbito). */
export async function canAssignOwnerMembership(userId: string): Promise<boolean> {
  return canManageStoresGlobally(userId)
}

export async function canAssignStoreAdminOnStore(
  actingUserId: string,
  targetStoreOid: Types.ObjectId
): Promise<boolean> {
  await connectDB()
  if (await canManageStoresGlobally(actingUserId)) return true
  return Boolean(
    await StoreMembership.exists({
      userId: actingUserId,
      storeId: targetStoreOid,
      role: 'owner'
    })
  )
}
