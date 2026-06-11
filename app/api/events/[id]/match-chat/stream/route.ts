import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import {
  listMatchChatMessages,
  parseSinceCursor,
  resolveMatchChatAccess
} from '@/lib/match-chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const POLL_MS = 2500
const HEARTBEAT_MS = 15000
const MAX_STREAM_MS = 55_000

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const t = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

/** SSE: empuja mensajes nuevos del chat de mesa (reconexión automática en cliente). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
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
    return new Response(JSON.stringify({ error: access.error }), {
      status: access.status,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let cursor = parseSinceCursor(
    url.searchParams.get('sinceId'),
    url.searchParams.get('since')
  )

  const encoder = new TextEncoder()
  const started = Date.now()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        )
      }

      send({
        type: 'ready',
        roundNum: access.roundNum,
        tableNumber: access.tableNumber
      })

      let lastHeartbeat = Date.now()

      try {
        while (Date.now() - started < MAX_STREAM_MS) {
          if (request.signal.aborted) break

          const messages = await listMatchChatMessages({
            eventId: access.eventId,
            roundNum: access.roundNum,
            tableNumber: access.tableNumber,
            sinceId: cursor.sinceId,
            sinceAt: cursor.sinceAt,
            viewerUserId: session.user!.id!
          })

          if (messages.length > 0) {
            send({ type: 'messages', messages })
            const last = messages[messages.length - 1]!
            cursor = { sinceId: last.id, sinceAt: null }
          }

          const now = Date.now()
          if (now - lastHeartbeat >= HEARTBEAT_MS) {
            controller.enqueue(encoder.encode(': ping\n\n'))
            lastHeartbeat = now
          }

          await sleep(POLL_MS, request.signal)
        }

        send({ type: 'reconnect' })
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('SSE match-chat stream:', err)
        }
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
