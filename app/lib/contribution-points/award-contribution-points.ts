import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  pointsForAction,
  type ContributionPointRules
} from '@/lib/contribution-points/point-rules'
import type {
  ContributionPointAction,
  ContributionPointCategory,
  ContributionPointSourceType
} from '@/lib/contribution-points/types'
import { assertContributionPointsEnabledForStore } from '@/lib/contribution-points/settings'
import ContributionPointEntry from '@/models/ContributionPointEntry'

export type AwardContributionPointsInput = {
  storeId: string | mongoose.Types.ObjectId
  userId: string | mongoose.Types.ObjectId
  category: ContributionPointCategory
  action: ContributionPointAction
  dedupeKey: string
  sourceType?: ContributionPointSourceType
  sourceId?: string | mongoose.Types.ObjectId
  metadata?: Record<string, unknown>
  /** Si se omite, se leen reglas de la tienda. */
  rulesOverride?: ContributionPointRules
}

export type AwardContributionPointsResult = {
  awarded: boolean
  points: number
  reason?: 'disabled' | 'zero_points' | 'duplicate' | 'inserted'
}

function toObjectId(
  id: string | mongoose.Types.ObjectId
): mongoose.Types.ObjectId {
  return id instanceof mongoose.Types.ObjectId
    ? id
    : new mongoose.Types.ObjectId(id)
}

export async function awardContributionPoints(
  input: AwardContributionPointsInput
): Promise<AwardContributionPointsResult> {
  const storeOid = toObjectId(input.storeId)
  const userOid = toObjectId(input.userId)
  const storeIdStr = storeOid.toString()

  await connectDB()

  let rules: ContributionPointRules
  if (input.rulesOverride) {
    rules = input.rulesOverride
  } else {
    const settings = await assertContributionPointsEnabledForStore(storeIdStr)
    if (!settings) {
      return { awarded: false, points: 0, reason: 'disabled' }
    }
    rules = settings.pointRules
  }

  const points = pointsForAction(input.action, rules)
  if (points <= 0) {
    return { awarded: false, points: 0, reason: 'zero_points' }
  }

  const dedupeKey = input.dedupeKey.trim().slice(0, 320)
  if (!dedupeKey) {
    return { awarded: false, points: 0, reason: 'zero_points' }
  }

  const sourceId =
    input.sourceId != null ? toObjectId(input.sourceId) : undefined

  try {
    await ContributionPointEntry.create({
      storeId: storeOid,
      userId: userOid,
      category: input.category,
      action: input.action,
      points,
      dedupeKey,
      ...(input.sourceType ? { sourceType: input.sourceType } : {}),
      ...(sourceId ? { sourceId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {})
    })
    return { awarded: true, points, reason: 'inserted' }
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11_000
    ) {
      return { awarded: false, points: 0, reason: 'duplicate' }
    }
    throw error
  }
}
