import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import {
  getOrBuildTournamentMetaCache,
  isPokemonTournamentMetaEligible
} from '@/lib/tournament-meta-cache'
import WeeklyEvent from '@/models/WeeklyEvent'

const META_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=600, stale-while-revalidate=1200'
} as const

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const eventId = id?.trim()
    if (!eventId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()

    const gate = await WeeklyEvent.findById(eventId)
      .select('kind game state tournamentOrigin')
      .lean()
    if (!gate) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    if (gate.kind !== 'tournament' || gate.game !== 'pokemon') {
      return NextResponse.json(
        { error: 'La meta solo aplica a torneos Pokémon TCG' },
        { status: 400 }
      )
    }

    if (!isPokemonTournamentMetaEligible(gate)) {
      return NextResponse.json(
        {
          error:
            'La meta del torneo (mazos y sprites de otros jugadores) estará disponible cuando el torneo esté cerrado.'
        },
        { status: 403 }
      )
    }

    const meta = await getOrBuildTournamentMetaCache(eventId)
    if (!meta) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json(meta, {
      status: 200,
      headers: META_CACHE_HEADERS
    })
  } catch (e) {
    console.error('GET /api/events/[id]/tournament-meta:', e)
    return NextResponse.json(
      { error: 'Error al cargar la meta del torneo' },
      { status: 500 }
    )
  }
}
