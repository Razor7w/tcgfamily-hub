import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { canManageTeam, getMembershipForUserOnTeam } from '@/lib/teams/access'
import TeamFriendlyMatch from '@/models/TeamFriendlyMatch'

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

    await connectDB()
    const match = await TeamFriendlyMatch.findById(raw)
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

    const opponentMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      match.opponentTeamId as mongoose.Types.ObjectId
    )
    if (!opponentMembership || !canManageTeam(opponentMembership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    match.status = 'declined'
    match.respondedByUserId = new mongoose.Types.ObjectId(
      gate.session.user!.id!
    )
    await match.save()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST friendly-matches decline:', e)
    return NextResponse.json(
      { error: 'No se pudo rechazar el versus' },
      { status: 500 }
    )
  }
}
