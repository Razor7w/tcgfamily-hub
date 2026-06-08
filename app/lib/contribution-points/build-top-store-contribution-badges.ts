import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { getChileCalendarMonthRangeUtc } from '@/lib/contribution-points/chile-month-range'
import {
  buildContributionTierProgress,
  resolveContributionCurrentTierLabel
} from '@/lib/contribution-points/tiers'
import { getContributionPointsSettingsForStoreOid } from '@/lib/contribution-points/settings'
import ContributionPointEntry from '@/models/ContributionPointEntry'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'
import Store from '@/models/Store'
import User from '@/models/User'

export type TopStoreContributionBadgeDTO = {
  tierIndex: number
  label: string
  storeId: string
  storeName: string
  storeSlug: string
  totalPoints: number
  monthPoints: number
  monthLabel: string
}

type StoreTotalsRow = {
  storeId: mongoose.Types.ObjectId
  totalPoints: number
}

async function loadContributionEnabledStoreIds(
  storeIds: mongoose.Types.ObjectId[]
): Promise<Set<string>> {
  if (storeIds.length === 0) return new Set()

  const docs = await DashboardModuleSettings.find({
    storeId: { $in: storeIds },
    contributionPointsEnabled: true
  })
    .select('storeId contributionPointsEnabled')
    .lean<{ storeId?: mongoose.Types.ObjectId }[]>()

  const enabled = new Set<string>()
  for (const doc of docs) {
    if (doc.storeId) enabled.add(String(doc.storeId))
  }
  return enabled
}

export async function buildTopStoreContributionBadgesForUsers(input: {
  userIds: string[]
}): Promise<Map<string, TopStoreContributionBadgeDTO>> {
  const result = new Map<string, TopStoreContributionBadgeDTO>()
  const uniqueIds = [
    ...new Set(
      input.userIds.filter(
        id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
      )
    )
  ]
  if (uniqueIds.length === 0) return result

  await connectDB()
  const userOids = uniqueIds.map(id => new mongoose.Types.ObjectId(id))

  const visibleUsers = await User.find({
    _id: { $in: userOids },
    contributionHideBadge: { $ne: true }
  })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId }[]>()

  if (visibleUsers.length === 0) return result

  const visibleIds = visibleUsers.map(u => u._id)
  const visibleIdSet = new Set(visibleIds.map(id => String(id)))

  const perStoreTotals = await ContributionPointEntry.aggregate<{
    _id: { userId: mongoose.Types.ObjectId; storeId: mongoose.Types.ObjectId }
    totalPoints: number
  }>([
    { $match: { userId: { $in: visibleIds } } },
    {
      $group: {
        _id: { userId: '$userId', storeId: '$storeId' },
        totalPoints: { $sum: '$points' }
      }
    },
    { $match: { totalPoints: { $gt: 0 } } }
  ])

  const bestByUser = new Map<string, StoreTotalsRow>()
  for (const row of perStoreTotals) {
    const userId = String(row._id.userId)
    if (!visibleIdSet.has(userId)) continue
    const totalPoints = Math.max(0, Math.round(Number(row.totalPoints) || 0))
    if (totalPoints <= 0) continue
    const prev = bestByUser.get(userId)
    if (!prev || totalPoints > prev.totalPoints) {
      bestByUser.set(userId, {
        storeId: row._id.storeId,
        totalPoints
      })
    }
  }

  if (bestByUser.size === 0) return result

  const storeOids = [
    ...new Set([...bestByUser.values()].map(v => String(v.storeId)))
  ]
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id))

  const enabledStoreIds = await loadContributionEnabledStoreIds(storeOids)

  const stores = await Store.find({
    _id: { $in: storeOids },
    isActive: true
  })
    .select('name slug')
    .lean<{ _id: mongoose.Types.ObjectId; name?: string; slug?: string }[]>()

  const storeById = new Map(stores.map(s => [String(s._id), s]))
  const monthRange = getChileCalendarMonthRangeUtc()

  const monthTotals = await ContributionPointEntry.aggregate<{
    _id: { userId: mongoose.Types.ObjectId; storeId: mongoose.Types.ObjectId }
    total: number
  }>([
    {
      $match: {
        userId: { $in: visibleIds },
        createdAt: {
          $gte: monthRange.start,
          $lt: monthRange.endExclusive
        }
      }
    },
    {
      $group: {
        _id: { userId: '$userId', storeId: '$storeId' },
        total: { $sum: '$points' }
      }
    }
  ])

  const monthByUserStore = new Map<string, number>()
  for (const row of monthTotals) {
    monthByUserStore.set(
      `${String(row._id.userId)}:${String(row._id.storeId)}`,
      Math.max(0, Math.round(Number(row.total) || 0))
    )
  }

  for (const [userId, best] of bestByUser) {
    const storeIdStr = String(best.storeId)
    if (!enabledStoreIds.has(storeIdStr)) continue

    const store = storeById.get(storeIdStr)
    const slug = typeof store?.slug === 'string' ? store.slug.trim() : ''
    const name = typeof store?.name === 'string' ? store.name.trim() : ''
    if (!slug || !name) continue

    const settings = await getContributionPointsSettingsForStoreOid(
      best.storeId
    )
    const tier = buildContributionTierProgress(
      best.totalPoints,
      settings.tierThresholds,
      settings.tierLabels,
      settings.baseTierLabel
    )

    const monthPoints = monthByUserStore.get(`${userId}:${storeIdStr}`) ?? 0

    result.set(userId, {
      tierIndex: tier.currentTierIndex,
      label: resolveContributionCurrentTierLabel(tier),
      storeId: storeIdStr,
      storeName: name,
      storeSlug: slug,
      totalPoints: best.totalPoints,
      monthPoints,
      monthLabel: monthRange.monthLabel
    })
  }

  return result
}
