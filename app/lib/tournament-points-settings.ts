import 'server-only'

import { getDashboardDocForStore } from '@/lib/dashboard-settings-for-store'
import { mergeStoreCreditAdmin } from '@/lib/store-credit-admin-settings'

export async function isTournamentPointsEnabledForStore(
  activeStoreMongoId: string
): Promise<boolean> {
  const doc = await getDashboardDocForStore(activeStoreMongoId)
  return mergeStoreCreditAdmin(doc).tournamentPointsEnabled
}

export async function isStoreCreditCsvEnabledForStore(
  activeStoreMongoId: string
): Promise<boolean> {
  const doc = await getDashboardDocForStore(activeStoreMongoId)
  return mergeStoreCreditAdmin(doc).csvEnabled
}
