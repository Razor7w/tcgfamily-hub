import { NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import {
  applyPreconTimerAction,
  findOrCreatePreconTimer,
  preconTimerSnapshot
} from '@/lib/precon-timer-server'

export const runtime = 'nodejs'

export async function GET() {
  const gate = await requireStoreStaffSession()
  if (!gate.ok) return gate.response
  try {
    const doc = await findOrCreatePreconTimer(gate.activeStoreOid)
    return NextResponse.json(preconTimerSnapshot(doc), {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar el reloj.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const gate = await requireStoreStaffSession()
  if (!gate.ok) return gate.response
  let body: { action?: unknown; minutes?: unknown; round?: unknown } | null
  try {
    body = (await request.json()) as {
      action?: unknown
      minutes?: unknown
      round?: unknown
    }
  } catch {
    body = null
  }
  try {
    const doc = await findOrCreatePreconTimer(gate.activeStoreOid)
    const error = await applyPreconTimerAction(doc, body?.action, {
      minutes: body?.minutes,
      round: body?.round
    })
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }
    return NextResponse.json(preconTimerSnapshot(doc), {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el reloj.' },
      { status: 500 }
    )
  }
}
