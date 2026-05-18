import type { Types } from 'mongoose'

/**
 * Coincide documentos con `storeId` igual a la tienda activa, o legacy sin campo
 * cuando la tienda activa es la primaria TCGFamily (migración en curso).
 */
export function mongoFilterByStore<
  const F extends Record<string, unknown> = Record<string, unknown>
>(
  activeStoreId: Types.ObjectId,
  primaryStoreId?: Types.ObjectId | null
): Record<string, unknown> | F {
  if (primaryStoreId && activeStoreId.equals(primaryStoreId)) {
    return {
      $or: [{ storeId: activeStoreId }, { storeId: { $exists: false } }]
    } as Record<string, unknown>
  }
  return { storeId: activeStoreId } as Record<string, unknown>
}
