import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { getDashboardDocForStore } from '@/lib/dashboard-settings-for-store'
import { mergeContributionPointsAdmin } from '@/lib/contribution-points-admin-settings'
import type { ContributionPointsAdminSettings } from '@/lib/contribution-points-admin-settings'

export async function isContributionPointsEnabledForStore(
  activeStoreMongoId: string
): Promise<boolean> {
  const doc = await getDashboardDocForStore(activeStoreMongoId)
  return mergeContributionPointsAdmin(doc).enabled
}

export async function getContributionPointsSettingsForStore(
  activeStoreMongoId: string
): Promise<ContributionPointsAdminSettings> {
  const doc = await getDashboardDocForStore(activeStoreMongoId)
  return mergeContributionPointsAdmin(doc)
}

export async function getContributionPointsSettingsForStoreOid(
  storeOid: mongoose.Types.ObjectId
): Promise<ContributionPointsAdminSettings> {
  return getContributionPointsSettingsForStore(storeOid.toString())
}

export async function assertContributionPointsEnabledForStore(
  activeStoreMongoId: string
): Promise<ContributionPointsAdminSettings | null> {
  await connectDB()
  const settings =
    await getContributionPointsSettingsForStore(activeStoreMongoId)
  return settings.enabled ? settings : null
}
