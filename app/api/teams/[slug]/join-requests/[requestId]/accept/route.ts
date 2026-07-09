import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { activateUserTeamMembership } from '@/lib/teams/activate-team-membership'
import { canManageTeam } from '@/lib/teams/access'
import { requireTeamManageAccess } from '@/lib/teams/manage-payload'
import Team from '@/models/Team'
import TeamJoinRequest from '@/models/TeamJoinRequest'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; requestId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw, requestId: rawRequestId } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const requestId =
      typeof rawRequestId === 'string' ? rawRequestId.trim() : ''

    const access = await requireTeamManageAccess(slug, gate.session.user!.id!)
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    if (!canManageTeam(access.viewerMembership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    await connectDB()

    const row = await TeamJoinRequest.findOne({
      _id: new mongoose.Types.ObjectId(requestId),
      teamId: access.teamOid,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).lean()

    if (!row) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada o expirada' },
        { status: 404 }
      )
    }

    const requesterUserId = String(row.requesterUserId)
    const activation = await activateUserTeamMembership(
      requesterUserId,
      access.teamOid,
      { keepJoinRequestId: requestId }
    )

    if (!activation.ok) {
      await TeamJoinRequest.updateOne(
        { _id: row._id },
        { $set: { status: 'cancelled' } }
      )
      return NextResponse.json(
        {
          error: activation.error,
          code: activation.code
        },
        { status: activation.status }
      )
    }

    await TeamJoinRequest.updateOne(
      { _id: row._id },
      {
        $set: {
          status: 'accepted',
          respondedByUserId: new mongoose.Types.ObjectId(gate.session.user!.id!)
        }
      }
    )

    const team = await Team.findById(access.teamOid)
      .select('name slug')
      .lean<{ name: string; slug: string } | null>()

    return NextResponse.json({
      ok: true,
      team: team
        ? { id: String(access.teamOid), name: team.name, slug: team.slug }
        : null,
      memberUserId: requesterUserId
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
          error: 'El jugador ya pertenece a un equipo',
          code: 'already_in_team'
        },
        { status: 409 }
      )
    }
    console.error('POST /api/teams/[slug]/join-requests/[requestId]/accept:', e)
    return NextResponse.json(
      { error: 'No se pudo aceptar la solicitud' },
      { status: 500 }
    )
  }
}
