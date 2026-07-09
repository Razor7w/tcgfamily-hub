import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import Team from '@/models/Team'
import TeamMembership from '@/models/TeamMembership'
import { userAlreadyInAnyTeam } from '@/lib/teams/access'
import { rejectOtherCaptainTeamApplications } from '@/lib/teams/approval-workflow'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const teamOid = new mongoose.Types.ObjectId(id)
    const team = await Team.findById(teamOid).lean()
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    if (team.approvalStatus === 'approved' && team.isActive) {
      return NextResponse.json({ ok: true, alreadyApproved: true })
    }

    if (team.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar solicitudes pendientes' },
        { status: 400 }
      )
    }

    const captainId = String(team.captainUserId)
    if (await userAlreadyInAnyTeam(captainId)) {
      return NextResponse.json(
        {
          error: 'El solicitante ya pertenece a otro equipo activo',
          code: 'captain_in_team'
        },
        { status: 409 }
      )
    }

    const reviewerOid = new mongoose.Types.ObjectId(gate.session.user!.id!)
    const captainOid = team.captainUserId as mongoose.Types.ObjectId

    await Team.updateOne(
      { _id: teamOid },
      {
        $set: {
          approvalStatus: 'approved',
          isActive: true,
          reviewedAt: new Date(),
          reviewedByUserId: reviewerOid,
          rejectionReason: ''
        }
      }
    )

    const existingMembership = await TeamMembership.findOne({
      teamId: teamOid,
      userId: captainOid
    }).lean()

    if (existingMembership) {
      await TeamMembership.updateOne(
        { _id: existingMembership._id },
        { $set: { status: 'active', role: 'captain' } }
      )
    } else {
      await TeamMembership.create({
        teamId: teamOid,
        userId: captainOid,
        role: 'captain',
        status: 'active'
      })
    }

    await rejectOtherCaptainTeamApplications({
      captainUserId: captainOid,
      exceptTeamId: teamOid,
      reviewedByUserId: reviewerOid
    })

    return NextResponse.json({
      ok: true,
      team: {
        id: String(team._id),
        name: team.name,
        slug: team.slug
      }
    })
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          error: 'El capitán ya tiene membresía activa en otro equipo',
          code: 'captain_in_team'
        },
        { status: 409 }
      )
    }
    console.error('POST /api/admin/teams/[id]/approve:', e)
    return NextResponse.json(
      { error: 'No se pudo aprobar el equipo' },
      { status: 500 }
    )
  }
}
