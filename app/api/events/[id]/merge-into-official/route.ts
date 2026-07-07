import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { executeMergeCustomIntoOfficial } from '@/lib/merge-custom-tournament'

export async function POST(
  request: NextRequest,
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const officialEventId =
      body &&
      typeof body === 'object' &&
      body !== null &&
      'officialEventId' in body &&
      typeof (body as { officialEventId?: unknown }).officialEventId ===
        'string'
        ? (body as { officialEventId: string }).officialEventId.trim()
        : ''

    if (!officialEventId) {
      return NextResponse.json(
        { error: 'Falta el torneo oficial destino' },
        { status: 400 }
      )
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
    const activeStoreId = (
      session.user as { activeStoreId?: string } | undefined
    )?.activeStoreId

    await connectDB()

    const result = await executeMergeCustomIntoOfficial({
      userId: session.user.id,
      uid,
      customEventId: id.trim(),
      officialEventId,
      userPopId,
      activeStoreId
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo vincular el torneo'
    const status = message.includes('No autorizado') ? 403 : 400
    console.error('POST /api/events/[id]/merge-into-official:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
