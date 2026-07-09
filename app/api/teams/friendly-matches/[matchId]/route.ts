import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import { canManageTeam, getMembershipForUserOnTeam } from '@/lib/teams/access'
import { buildTeamFriendlyMatchDetail } from '@/lib/teams/friendly-match/build-payload'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'

async function getViewerContext(userId: string, matchId: string) {
  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    return { error: 'Match inválido', status: 400 as const }
  }

  const match = await TeamFriendlyMatch.findById(matchId).lean()
  if (!match) {
    return { error: 'Match no encontrado', status: 404 as const }
  }

  const challengerTeamId = String(match.challengerTeamId)
  const opponentTeamId = String(match.opponentTeamId)

  const challengerMembership = await getMembershipForUserOnTeam(
    userId,
    match.challengerTeamId as mongoose.Types.ObjectId
  )
  const opponentMembership = await getMembershipForUserOnTeam(
    userId,
    match.opponentTeamId as mongoose.Types.ObjectId
  )

  if (!challengerMembership && !opponentMembership) {
    return { error: 'No autorizado', status: 403 as const }
  }

  const onChallenger = Boolean(challengerMembership)
  const membership = challengerMembership ?? opponentMembership!
  const viewerTeamId = onChallenger ? challengerTeamId : opponentTeamId

  return {
    matchOid: match._id as mongoose.Types.ObjectId,
    viewerTeamId,
    canManage: canManageTeam(membership.role)
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { matchId } = await context.params
    const ctx = await getViewerContext(gate.session.user!.id!, matchId)
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const match = await buildTeamFriendlyMatchDetail(
      ctx.matchOid,
      gate.session.user!.id!,
      ctx.viewerTeamId,
      ctx.canManage
    )

    if (!match) {
      return NextResponse.json(
        { error: 'Match no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ match })
  } catch (e) {
    console.error('GET /api/teams/friendly-matches/[matchId]:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar el versus' },
      { status: 500 }
    )
  }
}
