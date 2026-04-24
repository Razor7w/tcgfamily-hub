import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { LimitlessDmCardDetail } from '@/lib/limitless-dm-api'

const LIMITLESS_CARDS = 'https://limitlesstcg.com/api/dm/cards'

/**
 * Detalle de carta: `set` + `number` se traducen a `q=int:{SET}~{number}` (región int).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const set = searchParams.get('set')?.trim().toUpperCase() ?? ''
    const number = searchParams.get('number')?.trim() ?? ''

    if (!set || !number) {
      return NextResponse.json(
        { error: 'Parámetros set y number requeridos' },
        { status: 400 }
      )
    }

    const q = `int:${set}~${number}`
    const url = `${LIMITLESS_CARDS}?${new URLSearchParams({
      q,
      lang: 'en'
    })}`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      console.error('Limitless cards:', res.status)
      return NextResponse.json(
        { error: 'No se pudo cargar la carta' },
        { status: 502 }
      )
    }

    const data = (await res.json()) as LimitlessDmCardDetail[]
    const card = Array.isArray(data) && data.length > 0 ? data[0] : null
    if (!card) {
      return NextResponse.json(
        { error: 'Carta no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ card })
  } catch (e) {
    console.error('GET /api/limitless/cards:', e)
    return NextResponse.json(
      { error: 'Error al cargar la carta' },
      { status: 500 }
    )
  }
}
