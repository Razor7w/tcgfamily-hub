import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { getMembershipForUserOnTeam, isCaptain } from '@/lib/teams/access'
import TeamFriendlyMatch, {
  type ITeamFriendlyMatch
} from '@/models/TeamFriendlyMatch'

export async function requireCaptainOnFriendlyMatch(
  userId: string,
  matchId: mongoose.Types.ObjectId
): Promise<
  | { ok: true; match: ITeamFriendlyMatch }
  | { ok: false; error: string; status: number }
> {
  await connectDB()

  const match = await TeamFriendlyMatch.findById(matchId)
  if (!match) {
    return { ok: false, error: 'Match no encontrado', status: 404 }
  }

  const [challengerMembership, opponentMembership] = await Promise.all([
    getMembershipForUserOnTeam(
      userId,
      match.challengerTeamId as mongoose.Types.ObjectId
    ),
    getMembershipForUserOnTeam(
      userId,
      match.opponentTeamId as mongoose.Types.ObjectId
    )
  ])

  const isChallengerCaptain =
    challengerMembership != null && isCaptain(challengerMembership.role)
  const isOpponentCaptain =
    opponentMembership != null && isCaptain(opponentMembership.role)

  if (!isChallengerCaptain && !isOpponentCaptain) {
    return {
      ok: false,
      error: 'Solo el capitán de uno de los equipos puede hacer esto',
      status: 403
    }
  }

  return { ok: true, match }
}
