import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import { linkEventParticipantByPop } from '@/lib/link-tournament-participants-by-pop'
import { weeklyOfficialByIdForStaffGate } from '@/lib/multitenancy/staff-queries'

/**
 * POST — Vincula un participante del torneo (por POP) con la cuenta User que tenga ese POP.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id: eventId } = await context.params
    if (!eventId?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const rec =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}
    const popId = typeof rec.popId === 'string' ? rec.popId : ''

    await connectDB()

    const existing = await weeklyOfficialByIdForStaffGate(gate, eventId.trim())
    if (!existing) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(existing)
    if (forbidden) return forbidden

    let eventOid: mongoose.Types.ObjectId
    try {
      eventOid = new mongoose.Types.ObjectId(eventId.trim())
    } catch {
      return NextResponse.json(
        { error: 'ID de evento inválido' },
        { status: 400 }
      )
    }

    const result = await linkEventParticipantByPop(eventOid, popId)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        userId: result.userId,
        userName: result.userName,
        userEmail: result.userEmail,
        alreadyLinked: result.alreadyLinked
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(
      'POST /api/admin/events/[id]/participants/link-by-pop:',
      error
    )
    return NextResponse.json(
      { error: 'Error al vincular participante' },
      { status: 500 }
    )
  }
}
