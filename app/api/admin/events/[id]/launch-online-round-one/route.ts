import { NextRequest, NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import { launchOnlineTournamentRound1 } from '@/lib/online-tournament-advance-round'
import { weeklyOfficialByIdForStaffGate } from '@/lib/multitenancy/staff-queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Staff: publicar ronda 1 (emparejamiento al azar) en torneo online programado. */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response

    const { id: eventId } = await context.params
    if (!eventId?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const doc = await weeklyOfficialByIdForStaffGate(gate, eventId.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc)
    if (forbidden) return forbidden

    const result = await launchOnlineTournamentRound1({
      eventId: eventId.trim()
    })

    return NextResponse.json(
      {
        ok: true,
        roundNum: result.roundNum,
        pairingsCount: result.pairingsCount,
        launchStatus: result.launchStatus,
        advanceStatus: result.advanceStatus
      },
      { status: 200 }
    )
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Error al lanzar la ronda 1'
    const status =
      msg === 'Evento no encontrado'
        ? 404
        : msg.includes('Solo aplica') ||
            msg.includes('ya está') ||
            msg.includes('Agregá') ||
            msg.includes('No se puede') ||
            msg.includes('No se pudieron')
          ? 400
          : 500
    if (status === 500) {
      console.error(
        'POST /api/admin/events/[id]/launch-online-round-one:',
        error
      )
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
