import 'server-only'

import mongoose from 'mongoose'
import { awardContributionPoints } from '@/lib/contribution-points/award-contribution-points'
import {
  contributionDedupeMailReceivedInStore,
  contributionDedupeMailWithdrawnInStore
} from '@/lib/contribution-points/dedupe-keys'
import type { ContributionPointsAwardedItem } from '@/lib/contribution-points-public'

async function awardMailAction(input: {
  storeId: string
  userId: string
  mailId: string
  action: 'mail_received_in_store' | 'mail_withdrawn_in_store'
  dedupeKey: string
}): Promise<ContributionPointsAwardedItem> {
  try {
    const result = await awardContributionPoints({
      storeId: input.storeId,
      userId: input.userId,
      category: 'mail',
      action: input.action,
      dedupeKey: input.dedupeKey,
      sourceType: 'mail',
      sourceId: input.mailId,
      metadata: { mailId: input.mailId }
    })
    return {
      category: 'mail',
      action: input.action,
      points: result.points,
      awarded: result.awarded
    }
  } catch (error) {
    console.error(`applyMailContributionAwards (${input.action}):`, error)
    return {
      category: 'mail',
      action: input.action,
      points: 0,
      awarded: false
    }
  }
}

export async function applyMailReceivedInStoreContributionAward(input: {
  storeId: mongoose.Types.ObjectId | string
  fromUserId: mongoose.Types.ObjectId | string
  mailId: mongoose.Types.ObjectId | string
}): Promise<ContributionPointsAwardedItem[]> {
  const storeIdStr = String(input.storeId)
  const userIdStr = String(input.fromUserId)
  const mailIdStr = String(input.mailId)

  return [
    await awardMailAction({
      storeId: storeIdStr,
      userId: userIdStr,
      mailId: mailIdStr,
      action: 'mail_received_in_store',
      dedupeKey: contributionDedupeMailReceivedInStore(
        storeIdStr,
        userIdStr,
        mailIdStr
      )
    })
  ]
}

export async function applyMailWithdrawnInStoreContributionAward(input: {
  storeId: mongoose.Types.ObjectId | string
  userId: mongoose.Types.ObjectId | string
  mailId: mongoose.Types.ObjectId | string
}): Promise<ContributionPointsAwardedItem[]> {
  const storeIdStr = String(input.storeId)
  const userIdStr = String(input.userId)
  const mailIdStr = String(input.mailId)

  return [
    await awardMailAction({
      storeId: storeIdStr,
      userId: userIdStr,
      mailId: mailIdStr,
      action: 'mail_withdrawn_in_store',
      dedupeKey: contributionDedupeMailWithdrawnInStore(
        storeIdStr,
        userIdStr,
        mailIdStr
      )
    })
  ]
}

export async function applyMailStatusContributionAwards(input: {
  storeId: mongoose.Types.ObjectId | string
  mailId: mongoose.Types.ObjectId | string
  fromUserId: mongoose.Types.ObjectId | string
  toUserId?: mongoose.Types.ObjectId | string | null
  receivedInStore?: boolean
  withdrawn?: boolean
}): Promise<ContributionPointsAwardedItem[]> {
  const items: ContributionPointsAwardedItem[] = []

  if (input.receivedInStore) {
    items.push(
      ...(await applyMailReceivedInStoreContributionAward({
        storeId: input.storeId,
        fromUserId: input.fromUserId,
        mailId: input.mailId
      }))
    )
  }

  if (input.withdrawn) {
    const withdrawUserId =
      input.toUserId != null && String(input.toUserId).trim()
        ? String(input.toUserId)
        : String(input.fromUserId)
    items.push(
      ...(await applyMailWithdrawnInStoreContributionAward({
        storeId: input.storeId,
        userId: withdrawUserId,
        mailId: input.mailId
      }))
    )
  }

  return items
}
