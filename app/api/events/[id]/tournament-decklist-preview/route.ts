import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'
import WeeklyEvent from '@/models/WeeklyEvent'
import { resolveViewAsParticipant } from '@/lib/weekly-event-view-as'

/**
 * Texto del listado guardado asociado al torneo (vista en imágenes).
 * El decklist pertenece al participante cuyos datos se muestran (jugador o admin leyendo al creador).
 */
export async function GET(
  _request: Request,
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

    await connectDB()
    const uid = session.user.id
    const isAdmin = (session.user as { role?: string }).role === 'admin'

    const doc = await WeeklyEvent.findById(id.trim()).lean()
    if (!doc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const viewAs = resolveViewAsParticipant(doc, uid, isAdmin)
    const ref = viewAs?.tournamentDecklistRef
    if (!ref?.decklistId || !viewAs?.userId) {
      return NextResponse.json(
        { error: 'No hay decklist asociado a este torneo' },
        { status: 404 }
      )
    }

    const ownerId = new mongoose.Types.ObjectId(String(viewAs.userId))
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

    const title = `${deck.name} — ${sublabel}`

    return NextResponse.json(
      {
        title,
        deckText
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('GET /api/events/[id]/tournament-decklist-preview:', e)
    return NextResponse.json(
      { error: 'Error al cargar el decklist' },
      { status: 500 }
    )
  }
}
