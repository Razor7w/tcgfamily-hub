import {
  contributionDedupeOpponentSprites,
  contributionDedupeRoundComplete
} from '@/lib/contribution-points/dedupe-keys'
import type { ContributionPointAction } from '@/lib/contribution-points/types'
import { isOfficialTournamentForContribution } from '@/lib/contribution-points/tournament-origin'
import type { ParticipantMatchRoundDTO } from '@/lib/participant-match-round'

export type MatchRoundContributionAwardPlan = {
  action: Extract<
    ContributionPointAction,
    'opponent_sprites' | 'round_complete'
  >
  roundNum: number
  dedupeKey: string
}

function hasManualOpponentSprites(row: ParticipantMatchRoundDTO): boolean {
  if (row.opponentDeckFromPlatform) return false
  return row.opponentDeckSlugs.some(s => typeof s === 'string' && s.trim())
}

function isRoundComplete(row: ParticipantMatchRoundDTO): boolean {
  if (row.specialOutcome) return true
  return row.gameResults.length > 0 || row.turnOrders.length > 0
}

/**
 * Plan de puntos al persistir bitácora. Solo torneos oficiales (no custom).
 */
export function planMatchRoundContributionAwards(input: {
  storeId: string
  userId: string
  eventId: string
  tournamentOrigin: 'official' | 'custom'
  stored: ParticipantMatchRoundDTO[]
  next: ParticipantMatchRoundDTO[]
}): MatchRoundContributionAwardPlan[] {
  if (!isOfficialTournamentForContribution(input.tournamentOrigin)) {
    return []
  }

  const storedByRound = new Map(input.stored.map(r => [r.roundNum, r]))
  const plans: MatchRoundContributionAwardPlan[] = []

  for (const row of input.next) {
    const prev = storedByRound.get(row.roundNum)

    if (
      hasManualOpponentSprites(row) &&
      !(prev && hasManualOpponentSprites(prev))
    ) {
      plans.push({
        action: 'opponent_sprites',
        roundNum: row.roundNum,
        dedupeKey: contributionDedupeOpponentSprites(
          input.storeId,
          input.userId,
          input.eventId,
          row.roundNum
        )
      })
    }

    if (isRoundComplete(row) && !(prev && isRoundComplete(prev))) {
      plans.push({
        action: 'round_complete',
        roundNum: row.roundNum,
        dedupeKey: contributionDedupeRoundComplete(
          input.storeId,
          input.userId,
          input.eventId,
          row.roundNum
        )
      })
    }
  }

  return plans
}
