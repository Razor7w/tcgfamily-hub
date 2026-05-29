import 'server-only'

import mongoose from 'mongoose'
import { awardContributionPoints } from '@/lib/contribution-points/award-contribution-points'
import {
  contributionDedupeTournamentParticipated,
  contributionDedupeTournamentPreRegistered
} from '@/lib/contribution-points/dedupe-keys'
import {
  isOfficialTournamentForContribution,
  resolveTournamentContributionOrigin
} from '@/lib/contribution-points/tournament-origin'
import { resolveWeeklyEventStoreIdForContribution } from '@/lib/contribution-points/resolve-event-store-id'
import type { ContributionPointsAwardedItem } from '@/lib/contribution-points-public'

type LeanParticipant = {
  userId?: unknown
}

type LeanEventForTournamentContribution = {
  _id?: unknown
  kind?: string
  title?: string
  storeId?: unknown
  tournamentOrigin?: string
  participants?: LeanParticipant[]
}

export function isTournamentContributionEvent(
  event: LeanEventForTournamentContribution
): boolean {
  if (event.kind !== 'tournament') return false
  return isOfficialTournamentForContribution(
    resolveTournamentContributionOrigin(event.tournamentOrigin)
  )
}

function resolveStoreId(
  event: LeanEventForTournamentContribution,
  fallbackStoreId?: string | mongoose.Types.ObjectId | null
): Promise<mongoose.Types.ObjectId | null> {
  return resolveWeeklyEventStoreIdForContribution(event, fallbackStoreId)
}

async function awardTournamentAction(input: {
  storeId: mongoose.Types.ObjectId | string
  userId: mongoose.Types.ObjectId | string
  eventId: mongoose.Types.ObjectId | string
  eventTitle: string
  action: 'tournament_pre_registered' | 'tournament_participated'
  dedupeKey: string
}): Promise<ContributionPointsAwardedItem> {
  try {
    const result = await awardContributionPoints({
      storeId: input.storeId,
      userId: input.userId,
      category: 'tournament',
      action: input.action,
      dedupeKey: input.dedupeKey,
      sourceType: 'weekly_event',
      sourceId: input.eventId,
      metadata: {
        eventTitle: input.eventTitle,
        eventId: String(input.eventId)
      }
    })
    return {
      category: 'tournament',
      action: input.action,
      points: result.points,
      awarded: result.awarded
    }
  } catch (error) {
    console.error(`awardTournamentAction (${input.action}):`, error)
    return {
      category: 'tournament',
      action: input.action,
      points: 0,
      awarded: false
    }
  }
}

export async function applyTournamentPreRegisteredContributionAward(input: {
  storeId: mongoose.Types.ObjectId | string
  userId: mongoose.Types.ObjectId | string
  eventId: mongoose.Types.ObjectId | string
  eventTitle: string
}): Promise<ContributionPointsAwardedItem[]> {
  const storeIdStr = String(input.storeId)
  const userIdStr = String(input.userId)
  const eventIdStr = String(input.eventId)

  return [
    await awardTournamentAction({
      storeId: storeIdStr,
      userId: userIdStr,
      eventId: eventIdStr,
      eventTitle: input.eventTitle,
      action: 'tournament_pre_registered',
      dedupeKey: contributionDedupeTournamentPreRegistered(
        storeIdStr,
        userIdStr,
        eventIdStr
      )
    })
  ]
}

export async function applyTournamentParticipatedContributionAward(input: {
  storeId: mongoose.Types.ObjectId | string
  userId: mongoose.Types.ObjectId | string
  eventId: mongoose.Types.ObjectId | string
  eventTitle: string
}): Promise<ContributionPointsAwardedItem[]> {
  const storeIdStr = String(input.storeId)
  const userIdStr = String(input.userId)
  const eventIdStr = String(input.eventId)

  return [
    await awardTournamentAction({
      storeId: storeIdStr,
      userId: userIdStr,
      eventId: eventIdStr,
      eventTitle: input.eventTitle,
      action: 'tournament_participated',
      dedupeKey: contributionDedupeTournamentParticipated(
        storeIdStr,
        userIdStr,
        eventIdStr
      )
    })
  ]
}

/** Al cerrar torneo oficial: puntos a inscritos con cuenta en la lista final. */
export async function applyTournamentParticipationAwardsOnEventClose(
  event: LeanEventForTournamentContribution,
  fallbackStoreId?: string | mongoose.Types.ObjectId | null
): Promise<void> {
  if (!isTournamentContributionEvent(event)) return
  const storeId = await resolveStoreId(event, fallbackStoreId)
  if (!storeId || !event._id) return

  const eventId = new mongoose.Types.ObjectId(String(event._id))
  const eventTitle =
    typeof event.title === 'string' && event.title.trim()
      ? event.title.trim()
      : 'Torneo'

  for (const participant of event.participants ?? []) {
    if (
      !participant.userId ||
      !mongoose.Types.ObjectId.isValid(String(participant.userId))
    ) {
      continue
    }
    await applyTournamentParticipatedContributionAward({
      storeId,
      userId: String(participant.userId),
      eventId,
      eventTitle
    })
  }
}
