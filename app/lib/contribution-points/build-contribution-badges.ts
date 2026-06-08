import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  buildContributionTierProgress,
  resolveContributionCurrentTierLabel
} from '@/lib/contribution-points/tiers'
import { isContributionPointsEnabledForStore } from '@/lib/contribution-points/settings'
import { getContributionPointsSettingsForStoreOid } from '@/lib/contribution-points/settings'
import ContributionPointEntry from '@/models/ContributionPointEntry'
import User from '@/models/User'

export type ContributionBadgeDTO = {
  tierIndex: number
  label: string
}

export async function buildContributionBadgesForUsers(input: {
  storeId: mongoose.Types.ObjectId
  userIds: string[]
}): Promise<Map<string, ContributionBadgeDTO>> {
  const result = new Map<string, ContributionBadgeDTO>()
  const uniqueIds = [
    ...new Set(
      input.userIds.filter(
        id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
      )
    )
  ]
  if (uniqueIds.length === 0) return result

  const enabled = await isContributionPointsEnabledForStore(
    input.storeId.toString()
  )
  if (!enabled) return result

  await connectDB()
  const settings = await getContributionPointsSettingsForStoreOid(input.storeId)
  const userOids = uniqueIds.map(id => new mongoose.Types.ObjectId(id))

  const visibleUsers = await User.find({
    _id: { $in: userOids },
    contributionHideBadge: { $ne: true }
  })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId }[]>()

  if (visibleUsers.length === 0) return result

  const visibleIds = visibleUsers.map(u => u._id)
  const totals = await ContributionPointEntry.aggregate<{
    _id: mongoose.Types.ObjectId
    totalPoints: number
  }>([
    { $match: { storeId: input.storeId, userId: { $in: visibleIds } } },
    { $group: { _id: '$userId', totalPoints: { $sum: '$points' } } }
  ])

  for (const row of totals) {
    const total = Math.max(0, Math.round(Number(row.totalPoints) || 0))
    if (total <= 0) continue
    const tier = buildContributionTierProgress(
      total,
      settings.tierThresholds,
      settings.tierLabels,
      settings.baseTierLabel
    )
    result.set(String(row._id), {
      tierIndex: tier.currentTierIndex,
      label: resolveContributionCurrentTierLabel(tier)
    })
  }

  return result
}
