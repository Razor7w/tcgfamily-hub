import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  getPendingTeamApplicationForUser,
  userAlreadyInAnyTeam
} from '@/lib/teams/access'
import Team from '@/models/Team'
import TeamInvitation from '@/models/TeamInvitation'
import TeamMembership from '@/models/TeamMembership'

async function acceptInvitationForUser(
  userId: string,
  filter: { invitationId?: string }
) {
  if (
    !filter.invitationId ||
    !mongoose.Types.ObjectId.isValid(filter.invitationId)
  ) {
    return { error: 'Solicitud inválida', status: 400 as const }
  }

  await connectDB()
  const uid = new mongoose.Types.ObjectId(userId)

  const inv = await TeamInvitation.findOne({
    _id: new mongoose.Types.ObjectId(filter.invitationId),
    inviteeUserId: uid,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).lean()

  if (!inv) {
    return { error: 'Solicitud no encontrada o expirada', status: 404 as const }
  }

  const team = await Team.findOne({
    _id: inv.teamId,
    isActive: true
  }).lean()
  if (!team) {
    return { error: 'El equipo ya no existe', status: 404 as const }
  }

  if (await userAlreadyInAnyTeam(userId)) {
    return {
      error: 'Ya perteneces a un equipo',
      code: 'already_in_team',
      status: 409 as const
    }
  }

  const pendingApplication = await getPendingTeamApplicationForUser(userId)
  if (pendingApplication) {
    return {
      error: 'Tienes una solicitud de equipo pendiente de aprobación',
      code: 'team_application_pending',
      status: 409 as const
    }
  }

  const existingLeft = await TeamMembership.findOne({
    teamId: inv.teamId,
    userId: uid
  }).lean()

  if (existingLeft) {
    await TeamMembership.updateOne(
      { _id: existingLeft._id },
      { $set: { status: 'active', role: 'member' } }
    )
  } else {
    await TeamMembership.create({
      teamId: inv.teamId,
      userId: uid,
      role: 'member',
      status: 'active'
    })
  }

  await TeamInvitation.updateOne(
    { _id: inv._id },
    { $set: { status: 'accepted' } }
  )

  await TeamInvitation.updateMany(
    {
      _id: { $ne: inv._id },
      inviteeUserId: uid,
      status: 'pending'
    },
    { $set: { status: 'cancelled' } }
  )

  return {
    team: {
      id: String(team._id),
      name: team.name,
      slug: team.slug
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const body = await request.json().catch(() => null)
    const invitationId =
      typeof body?.invitationId === 'string' ? body.invitationId.trim() : ''

    const result = await acceptInvitationForUser(gate.session.user!.id!, {
      invitationId: invitationId || undefined
    })

    if ('error' in result) {
      return NextResponse.json(
        {
          error: result.error,
          code: 'code' in result ? result.code : undefined
        },
        { status: result.status }
      )
    }

    return NextResponse.json(result)
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: 'Ya perteneces a un equipo', code: 'already_in_team' },
        { status: 409 }
      )
    }
    console.error('POST /api/teams/invitations/accept:', e)
    return NextResponse.json(
      { error: 'No se pudo aceptar la solicitud' },
      { status: 500 }
    )
  }
}
