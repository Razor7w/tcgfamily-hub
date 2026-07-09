import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import TeamInvitation from '@/models/TeamInvitation'

export async function POST(request: NextRequest) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const body = await request.json().catch(() => null)
    const invitationId =
      typeof body?.invitationId === 'string' ? body.invitationId.trim() : ''

    if (!invitationId || !mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    await connectDB()
    const uid = new mongoose.Types.ObjectId(gate.session.user!.id!)

    const result = await TeamInvitation.updateOne(
      {
        _id: new mongoose.Types.ObjectId(invitationId),
        inviteeUserId: uid,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      },
      { $set: { status: 'declined' } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/teams/invitations/decline:', e)
    return NextResponse.json(
      { error: 'No se pudo rechazar la solicitud' },
      { status: 500 }
    )
  }
}
