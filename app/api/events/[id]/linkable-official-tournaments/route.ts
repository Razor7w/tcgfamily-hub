import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { listLinkableOfficialTournaments } from '@/lib/merge-custom-tournament'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(session.user.id)
    } catch {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const userPopId =
      typeof (session.user as { popid?: string }).popid === 'string'
        ? (session.user as { popid: string }).popid
        : ''

    await connectDB()

    const tournaments = await listLinkableOfficialTournaments(
      session.user.id,
      uid,
      id.trim(),
      userPopId
    )

    return NextResponse.json({ tournaments }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al cargar torneos'
    const status = message.includes('No autorizado') ? 403 : 400
    console.error('GET /api/events/[id]/linkable-official-tournaments:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
