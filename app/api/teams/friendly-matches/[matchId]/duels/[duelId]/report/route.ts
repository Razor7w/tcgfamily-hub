import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import { applyFriendlyDuelReport } from '@/lib/teams/friendly-match/lifecycle'
import { parseDuelReport } from '@/lib/teams/friendly-match/validation'
import { buildTeamFriendlyMatchDetail } from '@/lib/teams/friendly-match/build-payload'
import { getMembershipForUserOnTeam } from '@/lib/teams/access'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'
import TeamFriendlyMatchDuel from '@/models/TeamFriendlyMatchDuel'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string; duelId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { matchId: rawMatchId, duelId: rawDuelId } = await context.params
    if (
      !mongoose.Types.ObjectId.isValid(rawMatchId) ||
      !mongoose.Types.ObjectId.isValid(rawDuelId)
    ) {
      return NextResponse.json(
        { error: 'Identificador inválido' },
        { status: 400 }
      )
    }

    const duel = await TeamFriendlyMatchDuel.findById(rawDuelId).lean()
    if (!duel || String(duel.matchId) !== rawMatchId) {
      return NextResponse.json(
        { error: 'Duelo no encontrado' },
        { status: 404 }
      )
    }

    const match = await TeamFriendlyMatch.findById(rawMatchId).lean()
    if (!match) {
      return NextResponse.json(
        { error: 'Match no encontrado' },
        { status: 404 }
      )
    }

    const challengerMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      match.challengerTeamId as mongoose.Types.ObjectId
    )
    const opponentMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      match.opponentTeamId as mongoose.Types.ObjectId
    )
    const viewerTeamId = challengerMembership
      ? String(match.challengerTeamId)
      : opponentMembership
        ? String(match.opponentTeamId)
        : null

    if (!viewerTeamId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = parseDuelReport(body?.report)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const result = await applyFriendlyDuelReport({
      duelId: new mongoose.Types.ObjectId(rawDuelId),
      reporterUserId: gate.session.user!.id!,
      report: parsed.report
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      )
    }

    const detail = await buildTeamFriendlyMatchDetail(
      new mongoose.Types.ObjectId(rawMatchId),
      gate.session.user!.id!,
      viewerTeamId,
      Boolean(challengerMembership || opponentMembership)
    )

    return NextResponse.json({ match: detail })
  } catch (e) {
    console.error('POST friendly duel report:', e)
    return NextResponse.json(
      { error: 'No se pudo registrar el resultado' },
      { status: 500 }
    )
  }
}
