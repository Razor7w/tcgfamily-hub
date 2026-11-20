import { NextResponse } from 'next/server'
import {
  findPreconTimerByToken,
  preconTimerSnapshot
} from '@/lib/precon-timer-server'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ token: string }> }

export async function GET(_request: Request, context: Ctx) {
  const { token: raw } = await context.params
  const token = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  try {
    const doc = await findPreconTimerByToken(token)
    if (!doc) {
      return NextResponse.json(
        { error: 'Este enlace no existe.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    return NextResponse.json(preconTimerSnapshot(doc), {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo leer el reloj.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
