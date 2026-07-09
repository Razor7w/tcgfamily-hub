import { NextRequest, NextResponse } from 'next/server'
import { buildPublicTeamsDirectory } from '@/lib/teams/public-directory'

/**
 * Directorio de equipos aprobados y publicados (sin datos sensibles).
 */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('limit')
    let limit = 24
    if (raw != null) {
      const n = Number.parseInt(raw, 10)
      if (Number.isFinite(n) && n >= 1) limit = n
    }

    const teams = await buildPublicTeamsDirectory(limit)

    return NextResponse.json(
      { teams, total: teams.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
        }
      }
    )
  } catch (e) {
    console.error('GET /api/teams/public:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los equipos' },
      { status: 500 }
    )
  }
}
