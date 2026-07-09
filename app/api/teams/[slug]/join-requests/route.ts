import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  getMembershipForUserOnTeam,
  getApprovedTeamBySlug,
  userAlreadyInAnyTeam,
  userCanApplyForTeam
} from '@/lib/teams/access'
import { teamJoinRequestExpiryDate } from '@/lib/teams/join-request-expiry'
import TeamInvitation from '@/models/TeamInvitation'
import TeamJoinRequest from '@/models/TeamJoinRequest'
import TeamMembership from '@/models/TeamMembership'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const userId = gate.session.user!.id!
    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const teamOid = team._id as mongoose.Types.ObjectId

    if (String(team.captainUserId) === userId) {
      return NextResponse.json(
        { error: 'No puedes solicitar unirte a tu propio equipo' },
        { status: 400 }
      )
    }

    const existingMember = await getMembershipForUserOnTeam(userId, teamOid)
    if (existingMember) {
      return NextResponse.json(
        { error: 'Ya eres miembro de este equipo', code: 'already_member' },
        { status: 409 }
      )
    }

    if (!(await userCanApplyForTeam(userId))) {
      if (await userAlreadyInAnyTeam(userId)) {
        return NextResponse.json(
          { error: 'Ya perteneces a un equipo', code: 'already_in_team' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error: 'Tienes una solicitud de equipo pendiente de aprobación',
          code: 'team_application_pending'
        },
        { status: 409 }
      )
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(userId)

    const pendingInvite = await TeamInvitation.findOne({
      teamId: teamOid,
      inviteeUserId: uid,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).lean()
    if (pendingInvite) {
      return NextResponse.json(
        {
          error:
            'Ya tienes una invitación pendiente a este equipo. Revísala en notificaciones.',
          code: 'invite_pending'
        },
        { status: 409 }
      )
    }

    const pendingDup = await TeamJoinRequest.findOne({
      teamId: teamOid,
      requesterUserId: uid,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).lean()
    if (pendingDup) {
      return NextResponse.json(
        {
          error: 'Ya enviaste una solicitud a este equipo',
          code: 'join_request_pending'
        },
        { status: 409 }
      )
    }

    const pendingOtherTeam = await TeamJoinRequest.findOne({
      requesterUserId: uid,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).lean()
    if (pendingOtherTeam) {
      return NextResponse.json(
        {
          error: 'Ya tienes una solicitud pendiente a otro equipo',
          code: 'join_request_other_team'
        },
        { status: 409 }
      )
    }

    const wasMember = await TeamMembership.exists({
      teamId: teamOid,
      userId: uid,
      status: 'left'
    })

    const req = await TeamJoinRequest.create({
      teamId: teamOid,
      requesterUserId: uid,
      status: 'pending',
      expiresAt: teamJoinRequestExpiryDate()
    })

    return NextResponse.json(
      {
        joinRequest: {
          id: String(req._id),
          teamId: String(teamOid),
          teamSlug: team.slug,
          teamName: team.name,
          expiresAt: req.expiresAt.toISOString(),
          wasFormerMember: Boolean(wasMember)
        }
      },
      { status: 201 }
    )
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          error: 'Ya tienes una solicitud pendiente',
          code: 'join_request_pending'
        },
        { status: 409 }
      )
    }
    console.error('POST /api/teams/[slug]/join-requests:', e)
    return NextResponse.json(
      { error: 'No se pudo enviar la solicitud' },
      { status: 500 }
    )
  }
}
