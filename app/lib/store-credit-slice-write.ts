import type { Types } from 'mongoose'
import User from '@/models/User'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'
import { resolveStoreWalletForUser } from '@/lib/store-credit-resolve'

export type SliceRow = {
  saldo: number
  proximosVencer: number
  expiry?: Date | null
}

/** Actualiza o inserta la entrada de créditos en `storeCredits` para una tienda. */
export async function applyStoreCreditSlice(
  userOid: Types.ObjectId,
  storeOid: Types.ObjectId,
  row: SliceRow
): Promise<void> {
  // Documentos previos al campo: sin `storeCredits` Mongo rechaza `storeCredits.$[elem]`.
  await User.updateOne(
    {
      _id: userOid,
      $or: [{ storeCredits: { $exists: false } }, { storeCredits: null }]
    },
    { $set: { storeCredits: [] } }
  )

  const setDoc: Record<string, unknown> = {
    'storeCredits.$[elem].storePoints': row.saldo,
    'storeCredits.$[elem].storePointsExpiringNext': row.proximosVencer
  }
  if (row.expiry) {
    setDoc['storeCredits.$[elem].storePointsExpiryDate'] = row.expiry
  } else {
    setDoc['storeCredits.$[elem].storePointsExpiryDate'] = null
  }

  const res = await User.updateOne(
    { _id: userOid },
    { $set: setDoc },
    { arrayFilters: [{ 'elem.storeId': storeOid }] }
  )

  if (res.modifiedCount > 0) return

  const pushDoc: Record<string, unknown> = {
    storeId: storeOid,
    storePoints: row.saldo,
    storePointsExpiringNext: row.proximosVencer
  }
  if (row.expiry) {
    pushDoc.storePointsExpiryDate = row.expiry
  }

  await User.updateOne({ _id: userOid }, { $push: { storeCredits: pushDoc } })
}

/** Suma puntos al saldo de la tienda (sin tocar vencimiento). */
export async function incrementStoreCreditPoints(
  userOid: Types.ObjectId,
  storeOid: Types.ObjectId,
  primaryStoreOid: Types.ObjectId | null,
  delta: number
): Promise<void> {
  const add = normalizeStorePointsAmount(delta)
  if (add === 0) return

  const user = await User.findById(userOid)
    .select(
      'storeCredits storePoints storePointsExpiringNext storePointsExpiryDate'
    )
    .lean()
  if (!user) return

  const wallet = resolveStoreWalletForUser(
    user as Parameters<typeof resolveStoreWalletForUser>[0],
    storeOid,
    primaryStoreOid
  )

  await applyStoreCreditSlice(userOid, storeOid, {
    saldo: Math.max(0, normalizeStorePointsAmount(wallet.storePoints + add)),
    proximosVencer: wallet.storePointsExpiringNext,
    expiry: wallet.storePointsExpiryDate
  })
}
