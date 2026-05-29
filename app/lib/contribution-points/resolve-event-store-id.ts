import 'server-only'

import mongoose from 'mongoose'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'

type EventWithOptionalStore = {
  storeId?: unknown
}

/** Tienda para ledger: `event.storeId`, sesión activa o primaria (legacy sin storeId). */
export async function resolveWeeklyEventStoreIdForContribution(
  event: EventWithOptionalStore,
  fallbackStoreId?: string | mongoose.Types.ObjectId | null
): Promise<mongoose.Types.ObjectId | null> {
  if (
    event.storeId != null &&
    mongoose.Types.ObjectId.isValid(String(event.storeId))
  ) {
    return new mongoose.Types.ObjectId(String(event.storeId))
  }

  if (
    fallbackStoreId != null &&
    mongoose.Types.ObjectId.isValid(String(fallbackStoreId))
  ) {
    return new mongoose.Types.ObjectId(String(fallbackStoreId))
  }

  return memoPrimaryTcgfamilyStoreObjectId()
}
