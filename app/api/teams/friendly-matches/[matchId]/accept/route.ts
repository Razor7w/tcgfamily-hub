import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { canManageTeam, getMembershipForUserOnTeam } from '@/lib/teams/access'
import { buildTeamFriendlyMatchDetail } from '@/lib/teams/friendly-match/build-payload'
import { createFriendlyMatchDuels } from '@/lib/teams/friendly-match/lifecycle'
import {
  assertLineupBelongsToTeam,
  parseFriendlyLineupInput
} from '@/lib/teams/friendly-match/validation'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { matchId: raw } = await context.params
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      return NextResponse.json({ error: 'Match inválido' }, { status: 400 })
    }

    await connectDB()
    const matchOid = new mongoose.Types.ObjectId(raw)
    const match = await TeamFriendlyMatch.findById(matchOid)
    if (!match) {
      return NextResponse.json(
        { error: 'Match no encontrado' },
        { status: 404 }
      )
    }

    if (match.status !== 'pending') {
      return NextResponse.json(
        { error: 'Este versus ya fue respondido' },
        { status: 400 }
      )
    }

    if (match.expiresAt && match.expiresAt.getTime() < Date.now()) {
      match.status = 'cancelled'
      await match.save()
      return NextResponse.json(
        { error: 'La solicitud expiró' },
        { status: 410 }
      )
    }

    const opponentMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      match.opponentTeamId as mongoose.Types.ObjectId
    )
    if (!opponentMembership || !canManageTeam(opponentMembership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsedLineup = parseFriendlyLineupInput(body?.lineup)
    if (!parsedLineup.ok) {
      return NextResponse.json({ error: parsedLineup.error }, { status: 400 })
    }

    const lineupCheck = await assertLineupBelongsToTeam(
      match.opponentTeamId as mongoose.Types.ObjectId,
      parsedLineup.lineup
    )
    if (!lineupCheck.ok) {
      return NextResponse.json({ error: lineupCheck.error }, { status: 400 })
    }

    match.opponentLineup = parsedLineup.lineup.map(slot => ({
      userId: new mongoose.Types.ObjectId(slot.userId),
      slot: slot.slot
    }))
    match.respondedByUserId = new mongoose.Types.ObjectId(
      gate.session.user!.id!
    )
    match.status = 'in_progress'
    match.acceptedAt = new Date()
    await match.save()

    const challengerLineup = (match.challengerLineup ?? []).map(slot => ({
      userId: String(slot.userId),
      slot: slot.slot
    }))

    await createFriendlyMatchDuels(
      matchOid,
      challengerLineup,
      parsedLineup.lineup
    )

    const detail = await buildTeamFriendlyMatchDetail(
      matchOid,
      gate.session.user!.id!,
      String(match.opponentTeamId),
      true
    )

    return NextResponse.json({ match: detail })
  } catch (e) {
    console.error('POST friendly-matches accept:', e)
    return NextResponse.json(
      { error: 'No se pudo aceptar el versus' },
      { status: 500 }
    )
  }
}
