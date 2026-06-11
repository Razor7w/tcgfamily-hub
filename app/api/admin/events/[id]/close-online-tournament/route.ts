import { NextRequest, NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import { finalizeOnlineTournament } from '@/lib/online-tournament-advance-round'
import { weeklyOfficialByIdForStaffGate } from '@/lib/multitenancy/staff-queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Staff: cerrar torneo online (todas las mesas de la ronda actual confirmadas). */
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

    const result = await finalizeOnlineTournament({
      eventId: eventId.trim(),
      storeId: gate.activeStoreOid
    })

    return NextResponse.json(
      {
        ok: true,
        state: result.state,
        advanceStatus: result.advanceStatus,
        tournamentStandingsCategories: result.tournamentStandingsCategories
      },
      { status: 200 }
    )
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Error al finalizar torneo'
    const status =
      msg === 'Evento no encontrado'
        ? 404
        : msg.includes('Solo aplica') ||
            msg.includes('debe estar') ||
            msg.includes('ya está') ||
            msg.includes('Faltan') ||
            msg.includes('conflicto') ||
            msg.includes('confirmadas') ||
            msg.includes('No se puede')
          ? 400
          : 500
    if (status === 500) {
      console.error(
        'POST /api/admin/events/[id]/close-online-tournament:',
        error
      )
    }
    return NextResponse.json({ error: msg }, { status })
  }
}
