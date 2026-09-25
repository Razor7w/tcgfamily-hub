import 'server-only'

import { getDashboardDocForStore } from '@/lib/dashboard-settings-for-store'
import { mergeStoreCreditAdmin } from '@/lib/store-credit-admin-settings'

export async function isTournamentPointsEnabledForStore(
  activeStoreMongoId: string
): Promise<boolean> {
  const doc = await getDashboardDocForStore(activeStoreMongoId)
  return mergeStoreCreditAdmin(doc).tournamentPointsEnabled
}

export async function getTournamentPointsPublicConfig(
  activeStoreMongoId: string
): Promise<{ enabled: boolean; label: string }> {
  const doc = await getDashboardDocForStore(activeStoreMongoId)
  const settings = mergeStoreCreditAdmin(doc)
  return {
    enabled: settings.tournamentPointsEnabled,
    label: settings.tournamentPointsLabel
  }
}

export async function isStoreCreditCsvEnabledForStore(
  activeStoreMongoId: string
): Promise<boolean> {
  const doc = await getDashboardDocForStore(activeStoreMongoId)
  return mergeStoreCreditAdmin(doc).csvEnabled
}
