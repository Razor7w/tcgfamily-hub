import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildTournamentMetaPayload } from '@/lib/tournament-meta-build'
import { canExposeParticipantDecksToOthers } from '@/lib/weekly-events'
import { weeklyEventMetaProjection } from '@/lib/weekly-event-query-projections'
import WeeklyEvent from '@/models/WeeklyEvent'

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
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const doc = await WeeklyEvent.findById(id.trim())
      .select(weeklyEventMetaProjection)
      .lean()
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    if (doc.kind !== 'tournament' || doc.game !== 'pokemon') {
      return NextResponse.json(
        { error: 'La meta solo aplica a torneos Pokémon TCG' },
        { status: 400 }
      )
    }

    const tournamentOrigin =
      (doc as { tournamentOrigin?: string }).tournamentOrigin === 'custom'
        ? 'custom'
        : 'official'
    if (
      !canExposeParticipantDecksToOthers({
        state: doc.state,
        tournamentOrigin
      })
    ) {
      return NextResponse.json(
        {
          error:
            'La meta del torneo (mazos y sprites de otros jugadores) estará disponible cuando el torneo esté cerrado.'
        },
        { status: 403 }
      )
    }

    const meta = await buildTournamentMetaPayload(doc)
    return NextResponse.json(meta, { status: 200 })
  } catch (e) {
    console.error('GET /api/events/[id]/tournament-meta:', e)
    return NextResponse.json(
      { error: 'Error al cargar la meta del torneo' },
      { status: 500 }
    )
  }
}
