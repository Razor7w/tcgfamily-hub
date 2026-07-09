import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildTeamTournamentPointsRanking } from '@/lib/teams/tournament-points-ranking'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const periodRaw = request.nextUrl.searchParams.get('period')
    const period = periodRaw === 'all' ? 'all' : 'month'

    const ranking = await buildTeamTournamentPointsRanking({ period })

    return NextResponse.json(ranking, { status: 200 })
  } catch (error) {
    console.error('GET /api/teams/ranking:', error)
    return NextResponse.json(
      { error: 'Error al cargar ranking de equipos' },
      { status: 500 }
    )
  }
}
