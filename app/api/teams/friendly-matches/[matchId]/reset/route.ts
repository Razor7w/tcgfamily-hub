import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import { requireCaptainOnFriendlyMatch } from '@/lib/teams/friendly-match/captain-access'
import { buildTeamFriendlyMatchDetail } from '@/lib/teams/friendly-match/build-payload'
import { resetFriendlyMatch } from '@/lib/teams/friendly-match/lifecycle'
import { getMembershipForUserOnTeam } from '@/lib/teams/access'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { matchId: raw } = await context.params
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      return NextResponse.json({ error: 'Match inválido' }, { status: 400 })
    }

    const matchId = new mongoose.Types.ObjectId(raw)
    const access = await requireCaptainOnFriendlyMatch(
      gate.session.user!.id!,
      matchId
    )
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const result = await resetFriendlyMatch(matchId)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      )
    }

    const match = access.match
    const challengerMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      match.challengerTeamId as mongoose.Types.ObjectId
    )
    const viewerTeamId = challengerMembership
      ? String(match.challengerTeamId)
      : String(match.opponentTeamId)

    const detail = await buildTeamFriendlyMatchDetail(
      matchId,
      gate.session.user!.id!,
      viewerTeamId,
      true
    )

    return NextResponse.json({ match: detail })
  } catch (e) {
    console.error('POST friendly-matches reset:', e)
    return NextResponse.json(
      { error: 'No se pudo reiniciar el versus' },
      { status: 500 }
    )
  }
}
