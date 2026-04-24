import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  buildLimitlessSearchQueryParts,
  type LimitlessDmFormat,
  type LimitlessDmSearchHit,
  type LimitlessDmTypeFilter
} from '@/lib/limitless-dm-api'

const LIMITLESS_SEARCH = 'https://limitlesstcg.com/api/dm/search'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')?.trim() ?? ''
    const format = searchParams.get('format') as LimitlessDmFormat | null
    const typeRaw = searchParams.get('type') as LimitlessDmTypeFilter | null

    if (text.length < 1) {
      return NextResponse.json({ results: [] as LimitlessDmSearchHit[] })
    }

    const fmt =
      format === 'standard' || format === 'expanded' || format === 'glc'
        ? format
        : 'standard'
    const typeFilter =
      typeRaw &&
      [
        'all',
        'pokemon',
        'trainer',
        'energy',
        'item',
        'supporter',
        'stadium',
        'tool',
        'basic_energy',
        'special_energy'
      ].includes(typeRaw)
        ? typeRaw
        : 'all'

    const q = buildLimitlessSearchQueryParts({
      text,
      format: fmt,
      typeFilter: typeFilter === 'all' ? 'all' : typeFilter
    })

    const url = `${LIMITLESS_SEARCH}?${new URLSearchParams({
      q,
      lang: 'en'
    })}`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      console.error('Limitless search:', res.status, await res.text())
      return NextResponse.json(
        { error: 'Búsqueda no disponible en este momento' },
        { status: 502 }
      )
    }

    const data = (await res.json()) as LimitlessDmSearchHit[]
    return NextResponse.json({ results: Array.isArray(data) ? data : [] })
  } catch (e) {
    console.error('GET /api/limitless/search:', e)
    return NextResponse.json(
      { error: 'Error al buscar cartas' },
      { status: 500 }
    )
  }
}
