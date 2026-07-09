import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import { buildTeamFriendlyMatchDetail } from '@/lib/teams/friendly-match/build-payload'
import { replaceFriendlyMatchLineupSlot } from '@/lib/teams/friendly-match/lineup-roster'
import { getMembershipForUserOnTeam } from '@/lib/teams/access'
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

    const body = await request.json().catch(() => null)
    const side =
      body?.side === 'challenger' || body?.side === 'opponent'
        ? body.side
        : null
    const slot = typeof body?.slot === 'number' ? body.slot : null
    const newUserId = typeof body?.userId === 'string' ? body.userId.trim() : ''

    if (!side || slot == null || !newUserId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const matchOid = new mongoose.Types.ObjectId(raw)
    const result = await replaceFriendlyMatchLineupSlot({
      matchId: matchOid,
      managerUserId: gate.session.user!.id!,
      side,
      slot,
      newUserId
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      )
    }

    const match = await TeamFriendlyMatch.findById(matchOid).lean()
    if (!match) {
      return NextResponse.json({ ok: true })
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
    const canManage = Boolean(
      challengerMembership?.role === 'captain' ||
      challengerMembership?.role === 'co_captain' ||
      opponentMembership?.role === 'captain' ||
      opponentMembership?.role === 'co_captain'
    )

    const detail = await buildTeamFriendlyMatchDetail(
      matchOid,
      gate.session.user!.id!,
      viewerTeamId,
      canManage
    )

    return NextResponse.json({ match: detail })
  } catch (e) {
    console.error('POST friendly-matches replace-lineup:', e)
    return NextResponse.json(
      { error: 'No se pudo asignar el jugador' },
      { status: 500 }
    )
  }
}
