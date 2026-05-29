import 'server-only'

import mongoose from 'mongoose'
import { awardContributionPoints } from '@/lib/contribution-points/award-contribution-points'
import type { ContributionPointsAwardedItem } from '@/lib/contribution-points-public'
import {
  planMatchRoundContributionAwards,
  type MatchRoundContributionAwardPlan
} from '@/lib/contribution-points/plan-match-round-contribution-awards'
import type { ParticipantMatchRoundDTO } from '@/lib/participant-match-round'

export type { MatchRoundContributionAwardPlan }

export async function applyMatchRoundContributionAwards(input: {
  storeId: mongoose.Types.ObjectId | string
  userId: mongoose.Types.ObjectId | string
  eventId: mongoose.Types.ObjectId | string
  eventTitle: string
  tournamentOrigin: 'official' | 'custom'
  stored: ParticipantMatchRoundDTO[]
  next: ParticipantMatchRoundDTO[]
}): Promise<ContributionPointsAwardedItem[]> {
  const storeIdStr = String(input.storeId)
  const userIdStr = String(input.userId)
  const eventIdStr = String(input.eventId)

  const plans = planMatchRoundContributionAwards({
    storeId: storeIdStr,
    userId: userIdStr,
    eventId: eventIdStr,
    tournamentOrigin: input.tournamentOrigin,
    stored: input.stored,
    next: input.next
  })

  const feedback: ContributionPointsAwardedItem[] = []

  for (const plan of plans) {
    try {
      const result = await awardContributionPoints({
        storeId: storeIdStr,
        userId: userIdStr,
        category: 'tournament_log',
        action: plan.action,
        dedupeKey: plan.dedupeKey,
        sourceType: 'weekly_event',
        sourceId: eventIdStr,
        metadata: {
          eventTitle: input.eventTitle,
          roundNum: plan.roundNum
        }
      })
      feedback.push({
        category: 'tournament_log',
        action: plan.action,
        points: result.points,
        awarded: result.awarded
      })
    } catch (error) {
      console.error('applyMatchRoundContributionAwards:', plan.action, error)
      feedback.push({
        category: 'tournament_log',
        action: plan.action,
        points: 0,
        awarded: false
      })
    }
  }

  return feedback
}
