import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { buildAdminTeamDetail } from '@/lib/teams/admin-team-detail'

export const runtime = 'nodejs'

export async function GET(
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
    const detail = await buildAdminTeamDetail(new mongoose.Types.ObjectId(id))
    if (!detail) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ team: detail })
  } catch (e) {
    console.error('GET /api/admin/teams/[id]:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar el equipo' },
      { status: 500 }
    )
  }
}
