import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Team from '@/models/Team'
import TeamInvitation from '@/models/TeamInvitation'
import { deactivateCaptainTeamMemberships } from '@/lib/teams/approval-workflow'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const reason =
      typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''

    await connectDB()
    const teamOid = new mongoose.Types.ObjectId(id)
    const reviewerOid = new mongoose.Types.ObjectId(gate.session.user!.id!)

    const team = await Team.findOneAndUpdate(
      { _id: teamOid, approvalStatus: 'pending' },
      {
        $set: {
          approvalStatus: 'rejected',
          isActive: false,
          reviewedAt: new Date(),
          reviewedByUserId: reviewerOid,
          rejectionReason: reason
        }
      },
      { new: true }
    ).lean()

    if (!team) {
      const existing = await Team.findById(teamOid).lean()
      if (!existing) {
        return NextResponse.json(
          { error: 'Equipo no encontrado' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Solo se pueden rechazar solicitudes pendientes' },
        { status: 400 }
      )
    }

    await deactivateCaptainTeamMemberships({
      teamId: teamOid,
      captainUserId: team.captainUserId as mongoose.Types.ObjectId
    })

    await TeamInvitation.updateMany(
      { teamId: teamOid, status: 'pending' },
      { $set: { status: 'cancelled' } }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/admin/teams/[id]/reject:', e)
    return NextResponse.json(
      { error: 'No se pudo rechazar la solicitud' },
      { status: 500 }
    )
  }
}
