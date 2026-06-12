import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'
import WeeklyEvent from '@/models/WeeklyEvent'
import { canExposeParticipantDecksToOthers } from '@/lib/weekly-events'
import { weeklyEventMetaDecklistProjection } from '@/lib/weekly-event-query-projections'

/**
 * Texto del listado de un participante del torneo (vista meta / imágenes).
 * Requiere sesión; cualquier usuario autenticado del hub puede ver listados reportados.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const participantKey = new URL(request.url).searchParams
      .get('participantKey')
      ?.trim()
    if (!participantKey) {
      return NextResponse.json(
        { error: 'participantKey es requerido' },
        { status: 400 }
      )
    }

    await connectDB()
    const doc = await WeeklyEvent.findById(id.trim())
      .select(weeklyEventMetaDecklistProjection)
      .lean()
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    if (doc.kind !== 'tournament' || doc.game !== 'pokemon') {
      return NextResponse.json(
        { error: 'Solo aplica a torneos Pokémon' },
        { status: 400 }
      )
    }

    const parts = doc.participants ?? []
    const tournamentOrigin =
      (doc as { tournamentOrigin?: string }).tournamentOrigin === 'custom'
        ? 'custom'
        : 'official'
    const exposeDecks = canExposeParticipantDecksToOthers({
      state: doc.state,
      tournamentOrigin
    })

    const targetParticipant = parts.find(part => {
      if (participantKey.startsWith('name:')) {
        const name = participantKey.slice(5).trim()
        return (
          typeof part.displayName === 'string' &&
          part.displayName.trim() === name
        )
      }
      return part.userId && String(part.userId) === participantKey
    })
    const isOwnDecklist =
      targetParticipant?.userId &&
      String(targetParticipant.userId) === String(session.user.id)

    if (!exposeDecks && !isOwnDecklist) {
      return NextResponse.json(
        {
          error:
            'Los listados de otros jugadores estarán disponibles cuando el torneo esté cerrado.'
        },
        { status: 403 }
      )
    }

    if (!targetParticipant) {
      return NextResponse.json(
        { error: 'Participante no encontrado' },
        { status: 404 }
      )
    }

    const p = targetParticipant

    if (!p?.userId || !mongoose.Types.ObjectId.isValid(String(p.userId))) {
      return NextResponse.json(
        { error: 'Participante sin listado vinculado' },
        { status: 404 }
      )
    }

    const ref = p.tournamentDecklistRef
    if (!ref?.decklistId) {
      return NextResponse.json(
        { error: 'Este jugador no registró decklist' },
        { status: 404 }
      )
    }

    const ownerId = new mongoose.Types.ObjectId(String(p.userId))
    const deck = await SavedDecklist.findOne({
      _id: ref.decklistId,
      userId: ownerId
    })
    if (!deck) {
      return NextResponse.json(
        { error: 'Decklist no encontrado' },
        { status: 404 }
      )
    }

    const listKind = ref.listKind === 'variant' ? 'variant' : 'base'
    let deckText = typeof deck.deckText === 'string' ? deck.deckText : ''
    let sublabel = 'Listado base'

    if (listKind === 'variant' && ref.variantId) {
      const vid = String(ref.variantId)
      const v = deck.variants?.find(
        (x: {
          _id: mongoose.Types.ObjectId
          deckText?: string
          label?: string
        }) => String(x._id) === vid
      )
      if (!v?.deckText) {
        return NextResponse.json(
          { error: 'Variante no encontrada' },
          { status: 404 }
        )
      }
      deckText = v.deckText
      sublabel = v.label
    }

    const displayName =
      typeof p.displayName === 'string' && p.displayName.trim()
        ? p.displayName.trim()
        : 'Jugador'
    const title = `${displayName} — ${deck.name} — ${sublabel}`

    return NextResponse.json(
      {
        title,
        deckText,
        displayName
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('GET /api/events/[id]/tournament-meta/decklist:', e)
    return NextResponse.json(
      { error: 'Error al cargar el decklist' },
      { status: 500 }
    )
  }
}
