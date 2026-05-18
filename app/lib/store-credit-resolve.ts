import type { Types } from 'mongoose'

export type LeanStoreCreditSlice = {
  storeId: Types.ObjectId
  storePoints: number
  storePointsExpiringNext: number
  storePointsExpiryDate?: Date | null
}

export type LeanUserWallet = {
  storePoints?: number
  storePointsExpiringNext?: number
  storePointsExpiryDate?: Date | null
  storeCredits?: LeanStoreCreditSlice[]
}

export type ResolvedStoreWallet = {
  storePoints: number
  storePointsExpiringNext: number
  storePointsExpiryDate: Date | null
}

const zero: ResolvedStoreWallet = {
  storePoints: 0,
  storePointsExpiringNext: 0,
  storePointsExpiryDate: null
}

function legacyWallet(doc: LeanUserWallet): ResolvedStoreWallet {
  return {
    storePoints: doc.storePoints ?? 0,
    storePointsExpiringNext: doc.storePointsExpiringNext ?? 0,
    storePointsExpiryDate: doc.storePointsExpiryDate
      ? new Date(doc.storePointsExpiryDate)
      : null
  }
}

/** Créditos efectivos para `activeStore`; si no hay slice, cae en campos legacy solo en la tienda primaria (TCGFamily). */
export function resolveStoreWalletForUser(
  doc: LeanUserWallet,
  activeStoreOid: Types.ObjectId,
  primaryStoreOid: Types.ObjectId | null
): ResolvedStoreWallet {
  const slices = doc.storeCredits ?? []
  const hit = slices.find(s => activeStoreOid.equals(s.storeId))
  if (hit) {
    return {
      storePoints: hit.storePoints ?? 0,
      storePointsExpiringNext: hit.storePointsExpiringNext ?? 0,
      storePointsExpiryDate: hit.storePointsExpiryDate
        ? new Date(hit.storePointsExpiryDate)
        : null
    }
  }
  if (primaryStoreOid && activeStoreOid.equals(primaryStoreOid)) {
    return legacyWallet(doc)
  }
  return zero
}

export function isoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null
}
