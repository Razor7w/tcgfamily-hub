import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  buildContributionTierProgress,
  type ContributionTierProgress
} from '@/lib/contribution-points/tiers'
import {
  CONTRIBUTION_CATEGORY_LABELS,
  type ContributionPointCategory
} from '@/lib/contribution-points/types'
import { getChileCalendarMonthRangeUtc } from '@/lib/contribution-points/chile-month-range'
import { getContributionPointsSettingsForStoreOid } from '@/lib/contribution-points/settings'
import ContributionPointEntry from '@/models/ContributionPointEntry'

export type ContributionPointsByCategory = Record<
  ContributionPointCategory,
  number
>

export type MyContributionPointEntry = {
  id: string
  category: ContributionPointCategory
  categoryLabel: string
  action: string
  points: number
  createdAt: string
  metadata?: Record<string, unknown>
}

export type MyContributionPointsSummary = {
  enabled: boolean
  totalPoints: number
  monthPoints: number
  monthLabel: string
  byCategory: ContributionPointsByCategory
  tier: ContributionTierProgress
  recentEntries: MyContributionPointEntry[]
}

const EMPTY_BY_CATEGORY: ContributionPointsByCategory = {
  tournament: 0,
  tournament_deck: 0,
  tournament_log: 0,
  mail: 0
}

export async function buildMyContributionPointsSummary(input: {
  storeId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  enabled: boolean
  recentLimit?: number
}): Promise<MyContributionPointsSummary> {
  const settings = await getContributionPointsSettingsForStoreOid(input.storeId)
  const tierBase = {
    thresholds: settings.tierThresholds,
    labels: settings.tierLabels
  }

  const monthRange = getChileCalendarMonthRangeUtc()

  if (!input.enabled) {
    return {
      enabled: false,
      totalPoints: 0,
      monthPoints: 0,
      monthLabel: monthRange.monthLabel,
      byCategory: { ...EMPTY_BY_CATEGORY },
      tier: buildContributionTierProgress(
        0,
        tierBase.thresholds,
        tierBase.labels
      ),
      recentEntries: []
    }
  }

  await connectDB()

  const match = {
    storeId: input.storeId,
    userId: input.userId
  }

  const [totalsAgg, monthAgg, recentDocs] = await Promise.all([
    ContributionPointEntry.aggregate<{ _id: string; total: number }>([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$points' } } }
    ]),
    ContributionPointEntry.aggregate<{ total: number }>([
      {
        $match: {
          ...match,
          createdAt: {
            $gte: monthRange.start,
            $lt: monthRange.endExclusive
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]),
    ContributionPointEntry.find(match)
      .sort({ createdAt: -1 })
      .limit(Math.min(50, Math.max(1, input.recentLimit ?? 10)))
      .lean()
  ])

  const byCategory: ContributionPointsByCategory = { ...EMPTY_BY_CATEGORY }
  let totalPoints = 0
  for (const row of totalsAgg) {
    const cat = row._id as ContributionPointCategory
    if (!(cat in byCategory)) continue
    const pts = Math.max(0, Math.round(Number(row.total) || 0))
    byCategory[cat] = pts
    totalPoints += pts
  }

  const recentEntries: MyContributionPointEntry[] = recentDocs.map(doc => {
    const category = doc.category as ContributionPointCategory
    return {
      id: String(doc._id),
      category,
      categoryLabel: CONTRIBUTION_CATEGORY_LABELS[category] ?? category,
      action: String(doc.action ?? ''),
      points: Math.max(0, Math.round(Number(doc.points) || 0)),
      createdAt:
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString()
          : new Date().toISOString(),
      metadata:
        doc.metadata && typeof doc.metadata === 'object'
          ? (doc.metadata as Record<string, unknown>)
          : undefined
    }
  })

  const monthPoints = Math.max(0, Math.round(Number(monthAgg[0]?.total) || 0))

  return {
    enabled: true,
    totalPoints,
    monthPoints,
    monthLabel: monthRange.monthLabel,
    byCategory,
    tier: buildContributionTierProgress(
      totalPoints,
      tierBase.thresholds,
      tierBase.labels
    ),
    recentEntries
  }
}
