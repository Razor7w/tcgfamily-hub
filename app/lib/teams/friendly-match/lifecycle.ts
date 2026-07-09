import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  TEAM_FRIENDLY_POINTS_PER_TIE,
  TEAM_FRIENDLY_POINTS_PER_WIN,
  normalizeFriendlyDuelReport,
  type TeamFriendlyDuelReport,
  type TeamFriendlyLineupSize
} from '@/lib/teams/friendly-match/constants'
import { buildFriendlyMatchDuels } from '@/lib/teams/friendly-match/generate-duels'
import {
  reconcileFriendlyDuelReports,
  scoreFriendlyMatchFromDuels
} from '@/lib/teams/friendly-match/reconcile'
import TeamFriendlyMatch, {
  type ITeamFriendlyMatch
} from '@/models/TeamFriendlyMatch'
import TeamFriendlyMatchDuel from '@/models/TeamFriendlyMatchDuel'

export async function refreshFriendlyMatchScore(
  matchId: mongoose.Types.ObjectId
): Promise<void> {
  await connectDB()

  const match = await TeamFriendlyMatch.findById(matchId).lean()
  if (!match || match.status === 'pending' || match.status === 'declined') {
    return
  }

  const duels = await TeamFriendlyMatchDuel.find({ matchId }).lean()
  const challengerIds = new Set(
    (match.challengerLineup ?? []).map(s => String(s.userId))
  )

  const hasDisputed = duels.some(d => d.status === 'disputed')
  const allConfirmed =
    duels.length > 0 && duels.every(d => d.status === 'confirmed')

  const { challengerPoints, opponentPoints } = scoreFriendlyMatchFromDuels(
    duels.map(d => ({
      winnerUserId: d.winnerUserId ? String(d.winnerUserId) : null,
      challengerUserId: String(d.challengerUserId),
      isDraw:
        d.status === 'confirmed' &&
        !d.winnerUserId &&
        d.challengerReport === 'tie' &&
        d.opponentReport === 'tie'
    })),
    challengerIds,
    match.pointsPerWin ?? TEAM_FRIENDLY_POINTS_PER_WIN,
    TEAM_FRIENDLY_POINTS_PER_TIE
  )

  let status = match.status
  let winnerTeamId: mongoose.Types.ObjectId | undefined = match.winnerTeamId
  let completedAt: Date | undefined = match.completedAt

  if (hasDisputed) {
    status = 'disputed'
    winnerTeamId = undefined
    completedAt = undefined
  } else if (allConfirmed) {
    status = 'completed'
    completedAt = new Date()
    if (challengerPoints > opponentPoints) {
      winnerTeamId = match.challengerTeamId as mongoose.Types.ObjectId
    } else if (opponentPoints > challengerPoints) {
      winnerTeamId = match.opponentTeamId as mongoose.Types.ObjectId
    } else {
      winnerTeamId = undefined
    }
  } else {
    status = 'in_progress'
    winnerTeamId = undefined
    completedAt = undefined
  }

  await TeamFriendlyMatch.updateOne(
    { _id: matchId },
    {
      $set: {
        status,
        challengerPoints,
        opponentPoints,
        winnerTeamId,
        completedAt
      }
    }
  )
}

export async function createFriendlyMatchDuels(
  matchId: mongoose.Types.ObjectId,
  challengerLineup: { userId: string; slot: number }[],
  opponentLineup: { userId: string; slot: number }[],
  lineupSize: TeamFriendlyLineupSize
): Promise<void> {
  const seeds = buildFriendlyMatchDuels(
    challengerLineup,
    opponentLineup,
    lineupSize
  )

  await TeamFriendlyMatchDuel.insertMany(
    seeds.map(seed => ({
      matchId,
      duelIndex: seed.duelIndex,
      roundNumber: seed.roundNumber,
      challengerUserId: new mongoose.Types.ObjectId(seed.challengerUserId),
      opponentUserId: new mongoose.Types.ObjectId(seed.opponentUserId),
      challengerSlot: seed.challengerSlot,
      opponentSlot: seed.opponentSlot,
      status: 'pending_reports'
    }))
  )
}

export async function applyFriendlyDuelReport(input: {
  duelId: mongoose.Types.ObjectId
  reporterUserId: string
  report: TeamFriendlyDuelReport
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  await connectDB()

  const duel = await TeamFriendlyMatchDuel.findById(input.duelId)
  if (!duel) {
    return { ok: false, error: 'Duelo no encontrado', status: 404 }
  }

  const match = await TeamFriendlyMatch.findById(duel.matchId)
  if (!match || !['in_progress', 'disputed'].includes(match.status)) {
    return { ok: false, error: 'El match no está en juego', status: 400 }
  }

  const reporterId = input.reporterUserId
  const isChallenger = String(duel.challengerUserId) === reporterId
  const isOpponent = String(duel.opponentUserId) === reporterId

  if (!isChallenger && !isOpponent) {
    return {
      ok: false,
      error: 'Solo los jugadores del duelo pueden reportar',
      status: 403
    }
  }

  duel.challengerReport =
    normalizeFriendlyDuelReport(duel.challengerReport) ?? undefined
  duel.opponentReport =
    normalizeFriendlyDuelReport(duel.opponentReport) ?? undefined

  if (isChallenger) {
    duel.challengerReport = input.report
  } else {
    duel.opponentReport = input.report
  }

  const outcome = reconcileFriendlyDuelReports({
    challengerUserId: String(duel.challengerUserId),
    opponentUserId: String(duel.opponentUserId),
    challengerReport: duel.challengerReport ?? null,
    opponentReport: duel.opponentReport ?? null
  })

  if (outcome.status === 'confirmed') {
    duel.status = 'confirmed'
    if ('tie' in outcome && outcome.tie) {
      duel.winnerUserId = undefined
    } else if ('winnerUserId' in outcome) {
      duel.winnerUserId = new mongoose.Types.ObjectId(outcome.winnerUserId)
    }
  } else if (outcome.status === 'disputed') {
    duel.status = 'disputed'
    duel.winnerUserId = undefined
  } else {
    duel.status = 'pending_reports'
    duel.winnerUserId = undefined
  }

  await duel.save()
  await refreshFriendlyMatchScore(duel.matchId as mongoose.Types.ObjectId)

  return { ok: true }
}

const FRIENDLY_MATCH_CAPTAIN_MODERATION_STATUSES = [
  'in_progress',
  'completed',
  'disputed'
] as const

export function friendlyMatchAllowsCaptainModeration(
  match: Pick<ITeamFriendlyMatch, 'status' | 'tier'>
): boolean {
  return (
    match.tier === 'social' &&
    (FRIENDLY_MATCH_CAPTAIN_MODERATION_STATUSES as readonly string[]).includes(
      match.status
    )
  )
}

export async function resetFriendlyMatch(
  matchId: mongoose.Types.ObjectId
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  await connectDB()

  const match = await TeamFriendlyMatch.findById(matchId)
  if (!match) {
    return { ok: false, error: 'Match no encontrado', status: 404 }
  }

  if (!friendlyMatchAllowsCaptainModeration(match)) {
    return {
      ok: false,
      error: 'Solo puedes reiniciar versus amistosos en juego o finalizados',
      status: 400
    }
  }

  const duelCount = await TeamFriendlyMatchDuel.countDocuments({ matchId })
  if (duelCount === 0) {
    return {
      ok: false,
      error: 'El versus aún no tiene rondas generadas',
      status: 400
    }
  }

  await TeamFriendlyMatchDuel.updateMany(
    { matchId },
    {
      $set: { status: 'pending_reports' },
      $unset: {
        challengerReport: '',
        opponentReport: '',
        winnerUserId: ''
      }
    }
  )

  match.status = 'in_progress'
  match.challengerPoints = 0
  match.opponentPoints = 0
  match.winnerTeamId = undefined
  match.completedAt = undefined
  await match.save()

  return { ok: true }
}

export async function deleteFriendlyMatch(
  matchId: mongoose.Types.ObjectId
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  await connectDB()

  const match = await TeamFriendlyMatch.findById(matchId)
  if (!match) {
    return { ok: false, error: 'Match no encontrado', status: 404 }
  }

  if (!friendlyMatchAllowsCaptainModeration(match)) {
    return {
      ok: false,
      error: 'Solo puedes eliminar versus amistosos en juego o finalizados',
      status: 400
    }
  }

  await TeamFriendlyMatchDuel.deleteMany({ matchId })
  await TeamFriendlyMatch.deleteOne({ _id: matchId })

  return { ok: true }
}
