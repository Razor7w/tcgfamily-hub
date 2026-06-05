import 'server-only'

import mongoose from 'mongoose'
import { awardContributionPoints } from '@/lib/contribution-points/award-contribution-points'
import {
  contributionDedupeDecklistRef,
  contributionDedupeOwnDeck
} from '@/lib/contribution-points/dedupe-keys'
import { planDeckContributionAwards } from '@/lib/contribution-points/plan-deck-contribution-awards'
import type { ContributionPointsAwardedItem } from '@/lib/contribution-points-public'

export async function applyDeckContributionAwards(input: {
  storeId: mongoose.Types.ObjectId | string
  userId: mongoose.Types.ObjectId | string
  eventId: mongoose.Types.ObjectId | string
  eventTitle: string
  tournamentOrigin: 'official' | 'custom'
  previousSlugs: string[]
  nextSlugs: string[]
  previousDecklistRef?: {
    decklistId?: unknown
    listKind?: unknown
    variantId?: unknown
  } | null
  nextDecklistRef?: {
    decklistId?: unknown
    listKind?: unknown
    variantId?: unknown
  } | null
  userInitiatedSave?: boolean
}): Promise<ContributionPointsAwardedItem[]> {
  const storeIdStr = String(input.storeId)
  const userIdStr = String(input.userId)
  const eventIdStr = String(input.eventId)

  const plans = planDeckContributionAwards({
    tournamentOrigin: input.tournamentOrigin,
    previousSlugs: input.previousSlugs,
    nextSlugs: input.nextSlugs,
    previousDecklistRef: input.previousDecklistRef,
    nextDecklistRef: input.nextDecklistRef,
    userInitiatedSave: input.userInitiatedSave
  })

  const feedback: ContributionPointsAwardedItem[] = []

  for (const plan of plans) {
    const dedupeKey =
      plan.action === 'own_deck_reported'
        ? contributionDedupeOwnDeck(storeIdStr, userIdStr, eventIdStr)
        : contributionDedupeDecklistRef(storeIdStr, userIdStr, eventIdStr)

    try {
      const result = await awardContributionPoints({
        storeId: storeIdStr,
        userId: userIdStr,
        category: 'tournament_deck',
        action: plan.action,
        dedupeKey,
        sourceType: 'weekly_event',
        sourceId: eventIdStr,
        metadata: { eventTitle: input.eventTitle }
      })
      feedback.push({
        category: 'tournament_deck',
        action: plan.action,
        points: result.points,
        awarded: result.awarded
      })
    } catch (error) {
      console.error('applyDeckContributionAwards:', plan.action, error)
      feedback.push({
        category: 'tournament_deck',
        action: plan.action,
        points: 0,
        awarded: false
      })
    }
  }

  return feedback
}
