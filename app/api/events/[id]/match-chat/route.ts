import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  buildMatchChatContext,
  createMatchChatMessage,
  listMatchChatMessages,
  matchChatPostLimiter,
  normalizeMatchChatMessage,
  parseSinceCursor,
  resolveMatchChatAccess
} from '@/lib/match-chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Contexto de chat de mesa para el jugador en la ronda en curso. */
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

    if (url.searchParams.get('context') === '1') {
      const result = await buildMatchChatContext({
        eventId: id,
        userId: session.user.id
      })
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({ context: result.context }, { status: 200 })
    }

    const roundNum = url.searchParams.get('roundNum')
    const tableNumber = url.searchParams.get('tableNumber')
    const access = await resolveMatchChatAccess({
      eventId: id,
      userId: session.user.id,
      roundNumRaw: roundNum,
      tableNumberRaw: tableNumber
    })
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const { sinceId, sinceAt } = parseSinceCursor(
      url.searchParams.get('sinceId'),
      url.searchParams.get('since')
    )

    const messages = await listMatchChatMessages({
      eventId: access.eventId,
      roundNum: access.roundNum,
      tableNumber: access.tableNumber,
      sinceId,
      sinceAt,
      viewerUserId: session.user.id
    })

    return NextResponse.json(
      {
        roundNum: access.roundNum,
        tableNumber: access.tableNumber,
        messages
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  } catch (error) {
    console.error('GET /api/events/[id]/match-chat:', error)
    return NextResponse.json(
      { error: 'Error al cargar el chat' },
      { status: 500 }
    )
  }
}

/** Enviar mensaje al chat de la mesa. */
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
    const message = normalizeMatchChatMessage(rec.message)
    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje vacío o demasiado largo' },
        { status: 400 }
      )
    }

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

    const rateKey = `match-chat:${session.user.id}:${access.eventId}:${access.roundNum}:${access.tableNumber}`
    if (matchChatPostLimiter(rateKey)) {
      return NextResponse.json(
        { error: 'Demasiados mensajes. Espera un momento.' },
        { status: 429 }
      )
    }

    const saved = await createMatchChatMessage({
      access,
      userId: session.user.id,
      message
    })

    return NextResponse.json({ status: 'ok', message: saved }, { status: 201 })
  } catch (error) {
    console.error('POST /api/events/[id]/match-chat:', error)
    return NextResponse.json(
      { error: 'Error al enviar el mensaje' },
      { status: 500 }
    )
  }
}
