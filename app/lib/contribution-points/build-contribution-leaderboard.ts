import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { getChileCalendarMonthRangeUtc } from '@/lib/contribution-points/chile-month-range'
import {
  buildContributionTierProgress,
  resolveContributionCurrentTierLabel
} from '@/lib/contribution-points/tiers'
import {
  getContributionPointsSettingsForStoreOid,
  isContributionPointsEnabledForStore
} from '@/lib/contribution-points/settings'
import ContributionPointEntry from '@/models/ContributionPointEntry'
import User from '@/models/User'

export type ContributionLeaderboardPeriod = 'month' | 'all'

export type ContributionLeaderboardRow = {
  rank: number
  userId: string
  displayName: string
  totalPoints: number
  tierLabel: string
  hideBadge: boolean
}

export type ContributionLeaderboardResult = {
  period: ContributionLeaderboardPeriod
  periodLabel: string
  rows: ContributionLeaderboardRow[]
}

async function fetchLifetimeTotalsByUser(
  storeId: mongoose.Types.ObjectId,
  userIds: mongoose.Types.ObjectId[]
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map()

  const rows = await ContributionPointEntry.aggregate<{
    _id: mongoose.Types.ObjectId
    totalPoints: number
  }>([
    { $match: { storeId, userId: { $in: userIds } } },
    { $group: { _id: '$userId', totalPoints: { $sum: '$points' } } }
  ])

  return new Map(
    rows.map(row => [
      String(row._id),
      Math.max(0, Math.round(Number(row.totalPoints) || 0))
    ])
  )
}

function tierLabelForPoints(
  totalPoints: number,
  settings: Awaited<ReturnType<typeof getContributionPointsSettingsForStoreOid>>
): string {
  const tier = buildContributionTierProgress(
    totalPoints,
    settings.tierThresholds,
    settings.tierLabels,
    settings.baseTierLabel
  )
  return resolveContributionCurrentTierLabel(tier)
}

export async function buildContributionLeaderboard(input: {
  storeId: mongoose.Types.ObjectId
  limit?: number
  period?: ContributionLeaderboardPeriod
  referenceDate?: Date
}): Promise<ContributionLeaderboardResult> {
  const limit = Math.min(50, Math.max(1, input.limit ?? 10))
  const period = input.period ?? 'month'
  const reference = input.referenceDate ?? new Date()
  const monthRange = getChileCalendarMonthRangeUtc(reference)
  const periodLabel = period === 'month' ? monthRange.monthLabel : 'Histórico'

  const enabled = await isContributionPointsEnabledForStore(
    input.storeId.toString()
  )
  if (!enabled) {
    return { period, periodLabel, rows: [] }
  }

  await connectDB()
  const settings = await getContributionPointsSettingsForStoreOid(input.storeId)

  const match: Record<string, unknown> = { storeId: input.storeId }
  if (period === 'month') {
    match.createdAt = {
      $gte: monthRange.start,
      $lt: monthRange.endExclusive
    }
  }

  const totals = await ContributionPointEntry.aggregate<{
    _id: mongoose.Types.ObjectId
    totalPoints: number
  }>([
    { $match: match },
    { $group: { _id: '$userId', totalPoints: { $sum: '$points' } } },
    { $match: { totalPoints: { $gt: 0 } } },
    { $sort: { totalPoints: -1 } },
    { $limit: limit }
  ])

  if (totals.length === 0) {
    return { period, periodLabel, rows: [] }
  }

  const userIds = totals.map(t => t._id)
  const users = await User.find({ _id: { $in: userIds } })
    .select('name contributionHideBadge')
    .lean<
      {
        _id: mongoose.Types.ObjectId
        name?: string
        contributionHideBadge?: boolean
      }[]
    >()

  const userById = new Map(users.map(u => [String(u._id), u]))
  const lifetimeByUser =
    period === 'month'
      ? await fetchLifetimeTotalsByUser(input.storeId, userIds)
      : null

  const rows = totals.map((row, index) => {
    const totalPoints = Math.max(0, Math.round(Number(row.totalPoints) || 0))
    const user = userById.get(String(row._id))
    const hideBadge = user?.contributionHideBadge === true
    const displayName =
      typeof user?.name === 'string' && user.name.trim()
        ? user.name.trim()
        : 'Jugador'
    const tierPoints =
      period === 'month'
        ? (lifetimeByUser?.get(String(row._id)) ?? 0)
        : totalPoints

    return {
      rank: index + 1,
      userId: String(row._id),
      displayName,
      totalPoints,
      tierLabel: tierLabelForPoints(tierPoints, settings),
      hideBadge
    }
  })

  return { period, periodLabel, rows }
}
