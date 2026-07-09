import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resolveMatchChatAccess } from '@/lib/match-chat'
import {
  getOnlineMatchReport,
  normalizeReportedWinnerPopId,
  staffResolveOnlineMatchReport,
  submitOnlineMatchWinnerReport
} from '@/lib/online-table-match-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Estado del reporte mutuo de resultado (torneos online). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const url = request.nextUrl
    const access = await resolveMatchChatAccess({
      eventId: id,
      userId: session.user.id,
      roundNumRaw: url.searchParams.get('roundNum'),
      tableNumberRaw: url.searchParams.get('tableNumber')
    })
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const report = await getOnlineMatchReport({
      access,
      userId: session.user.id
    })

    return NextResponse.json(
      { report },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('GET /api/events/[id]/online-table-report:', error)
    return NextResponse.json(
      { error: 'Error al cargar el reporte' },
      { status: 500 }
    )
  }
}

/** Reportar quién ganó (toggle al repetir la misma opción). */
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const rec =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

    const access = await resolveMatchChatAccess({
      eventId: id,
      userId: session.user.id,
      roundNumRaw: rec.roundNum,
      tableNumberRaw: rec.tableNumber
    })
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const winnerPopId = normalizeReportedWinnerPopId(
      rec.winnerPopId,
      access.player1PopId,
      access.player2PopId
    )
    if (!winnerPopId) {
      return NextResponse.json(
        { error: 'Ganador inválido para esta mesa' },
        { status: 400 }
      )
    }

    try {
      const report = await submitOnlineMatchWinnerReport({
        access,
        userId: session.user.id,
        winnerPopId
      })
      return NextResponse.json({ status: 'ok', report }, { status: 200 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo reportar'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/events/[id]/online-table-report:', error)
    return NextResponse.json({ error: 'Error al reportar' }, { status: 500 })
  }
}

/** Staff: asignar ganador (conflicto, sin reporte o en curso). */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const rec =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

    const access = await resolveMatchChatAccess({
      eventId: id,
      userId: session.user.id,
      roundNumRaw: rec.roundNum,
      tableNumberRaw: rec.tableNumber
    })
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    if (!access.isStaff) {
      return NextResponse.json(
        { error: 'Solo el staff puede asignar el resultado' },
        { status: 403 }
      )
    }

    const winnerPopId = normalizeReportedWinnerPopId(
      rec.winnerPopId,
      access.player1PopId,
      access.player2PopId
    )
    if (!winnerPopId) {
      return NextResponse.json(
        { error: 'Ganador inválido para esta mesa' },
        { status: 400 }
      )
    }

    try {
      const report = await staffResolveOnlineMatchReport({
        access,
        userId: session.user.id,
        winnerPopId
      })
      return NextResponse.json({ status: 'ok', report }, { status: 200 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo resolver'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  } catch (error) {
    console.error('PATCH /api/events/[id]/online-table-report:', error)
    return NextResponse.json(
      { error: 'Error al resolver el reporte' },
      { status: 500 }
    )
  }
}
