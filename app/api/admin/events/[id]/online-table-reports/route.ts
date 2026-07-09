import { NextRequest, NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import { adminWeeklyEventForbiddenResponse } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import { weeklyOfficialByIdForStaffGate } from '@/lib/multitenancy/staff-queries'
import {
  listAdminOnlineTableReports,
  type AdminOnlineTableReportRow
} from '@/lib/online-table-conflicts-admin'
import type { OnlineTableMatchReportStatus } from '@/models/OnlineTableMatchReport'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS_FILTERS = new Set([
  'all',
  'open',
  'verifying',
  'verified',
  'conflict'
])

function readStatusFilter(
  raw: string | null
): OnlineTableMatchReportStatus | 'all' {
  const t = raw?.trim() ?? 'all'
  if (STATUS_FILTERS.has(t)) {
    return t as OnlineTableMatchReportStatus | 'all'
  }
  return 'all'
}

/** Staff: listado de reportes de mesa (conflictos y estado por ronda). */
export async function GET(
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

    await connectDB()
    const doc = await weeklyOfficialByIdForStaffGate(gate, eventId.trim())
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc)
    if (forbidden) return forbidden

    const statusFilter = readStatusFilter(
      request.nextUrl.searchParams.get('status')
    )

    const summary = await listAdminOnlineTableReports({
      eventId: eventId.trim(),
      statusFilter
    })

    return NextResponse.json(summary, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al cargar'
    const status =
      msg === 'Evento no encontrado'
        ? 404
        : msg === 'Solo aplica a torneos online'
          ? 400
          : 500
    if (status === 500) {
      console.error('GET /api/admin/events/[id]/online-table-reports:', error)
    }
    return NextResponse.json({ error: msg }, { status })
  }
}

export type { AdminOnlineTableReportRow }
