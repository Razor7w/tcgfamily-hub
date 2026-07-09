import type { TeamFriendlyDuelReport } from '@/lib/teams/friendly-match/constants'
import { normalizeFriendlyDuelReport } from '@/lib/teams/friendly-match/constants'

export type FriendlyDuelReconcileOutcome =
  | { status: 'pending_reports' }
  | { status: 'confirmed'; winnerUserId: string }
  | { status: 'confirmed'; tie: true }
  | { status: 'disputed' }

export function reconcileFriendlyDuelReports(input: {
  challengerUserId: string
  opponentUserId: string
  challengerReport: TeamFriendlyDuelReport | null
  opponentReport: TeamFriendlyDuelReport | null
}): FriendlyDuelReconcileOutcome {
  const { challengerUserId, opponentUserId } = input

  const challengerReport = normalizeFriendlyDuelReport(input.challengerReport)
  const opponentReport = normalizeFriendlyDuelReport(input.opponentReport)

  if (!challengerReport || !opponentReport) {
    return { status: 'pending_reports' }
  }

  if (challengerReport === 'tie' && opponentReport === 'tie') {
    return { status: 'confirmed', tie: true }
  }

  if (challengerReport === 'win' && opponentReport === 'loss') {
    return { status: 'confirmed', winnerUserId: challengerUserId }
  }

  if (challengerReport === 'loss' && opponentReport === 'win') {
    return { status: 'confirmed', winnerUserId: opponentUserId }
  }

  return { status: 'disputed' }
}

export function scoreFriendlyMatchFromDuels(
  duels: {
    winnerUserId?: string | null
    challengerUserId: string
    isDraw: boolean
  }[],
  challengerUserIds: Set<string>,
  pointsPerWin: number,
  pointsPerTie: number
): { challengerPoints: number; opponentPoints: number } {
  let challengerPoints = 0
  let opponentPoints = 0

  for (const duel of duels) {
    if (duel.isDraw) {
      challengerPoints += pointsPerTie
      opponentPoints += pointsPerTie
      continue
    }

    const winnerId = duel.winnerUserId
    if (!winnerId) continue
    if (challengerUserIds.has(winnerId)) {
      challengerPoints += pointsPerWin
    } else {
      opponentPoints += pointsPerWin
    }
  }

  return { challengerPoints, opponentPoints }
}
