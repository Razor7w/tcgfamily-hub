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
        { error: 'Solo puedes cancelar solicitudes pendientes' },
        { status: 400 }
      )
    }

    const challengerMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      match.challengerTeamId as mongoose.Types.ObjectId
    )
    if (!challengerMembership || !canManageTeam(challengerMembership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    match.status = 'cancelled'
    await match.save()

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST friendly-matches cancel:', e)
    return NextResponse.json(
      { error: 'No se pudo cancelar el versus' },
      { status: 500 }
    )
  }
}
