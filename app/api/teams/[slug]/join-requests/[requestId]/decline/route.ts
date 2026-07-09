import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { canManageTeam } from '@/lib/teams/access'
import { requireTeamManageAccess } from '@/lib/teams/manage-payload'
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

    const result = await TeamJoinRequest.updateOne(
      {
        _id: new mongoose.Types.ObjectId(requestId),
        teamId: access.teamOid,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      },
      {
        $set: {
          status: 'declined',
          respondedByUserId: new mongoose.Types.ObjectId(gate.session.user!.id!)
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada o expirada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(
      'POST /api/teams/[slug]/join-requests/[requestId]/decline:',
      e
    )
    return NextResponse.json(
      { error: 'No se pudo rechazar la solicitud' },
      { status: 500 }
    )
  }
}
