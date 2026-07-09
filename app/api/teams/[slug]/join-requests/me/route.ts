import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { getApprovedTeamBySlug } from '@/lib/teams/access'
import TeamJoinRequest from '@/models/TeamJoinRequest'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    await connectDB()
    const row = await TeamJoinRequest.findOne({
      teamId: team._id,
      requesterUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).lean()

    return NextResponse.json({
      joinRequest: row
        ? {
            id: String(row._id),
            expiresAt: (row.expiresAt as Date).toISOString(),
            createdAt: row.createdAt.toISOString()
          }
        : null
    })
  } catch (e) {
    console.error('GET /api/teams/[slug]/join-requests/me:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar tu solicitud' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    await connectDB()
    const result = await TeamJoinRequest.updateOne(
      {
        teamId: team._id,
        requesterUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
        status: 'pending'
      },
      { $set: { status: 'cancelled' } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'No hay solicitud pendiente' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/teams/[slug]/join-requests/me:', e)
    return NextResponse.json(
      { error: 'No se pudo cancelar la solicitud' },
      { status: 500 }
    )
  }
}
