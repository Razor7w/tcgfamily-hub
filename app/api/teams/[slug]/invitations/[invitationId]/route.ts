import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  canManageTeam,
  getMembershipForUserOnTeam,
  getApprovedTeamBySlug
} from '@/lib/teams/access'
import TeamInvitation from '@/models/TeamInvitation'

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; invitationId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw, invitationId } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const teamOid = team._id as mongoose.Types.ObjectId
    const membership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      teamOid
    )
    if (!membership || !canManageTeam(membership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        { error: 'Invitación inválida' },
        { status: 400 }
      )
    }

    await connectDB()
    const result = await TeamInvitation.updateOne(
      {
        _id: new mongoose.Types.ObjectId(invitationId),
        teamId: teamOid,
        status: { $in: ['pending', 'awaiting_user'] }
      },
      { $set: { status: 'cancelled' } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/teams/[slug]/invitations/[invitationId]:', e)
    return NextResponse.json(
      { error: 'No se pudo cancelar la invitación' },
      { status: 500 }
    )
  }
}
