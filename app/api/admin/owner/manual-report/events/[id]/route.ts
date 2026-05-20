import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import { ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import { getTournamentDecklistDisplayLabels } from '@/lib/tournament-decklist-display'
import { serializeTournamentDecklistRef } from '@/lib/weekly-event-view-as'
import WeeklyEvent from '@/models/WeeklyEvent'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { id } = await context.params
    if (!id?.trim() || !mongoose.Types.ObjectId.isValid(id.trim())) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()

    const doc = await WeeklyEvent.findOne({
      _id: new mongoose.Types.ObjectId(id.trim()),
      ...ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER
    })
      .populate({ path: 'storeId', select: 'name slug' })
      .populate({ path: 'participants.userId', select: 'email name popid' })
      .lean()

    if (!doc) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    const store =
      doc.storeId &&
      typeof doc.storeId === 'object' &&
      doc.storeId !== null &&
      'name' in doc.storeId
        ? (doc.storeId as { _id?: unknown; name?: string; slug?: string })
        : null

    const participants = await Promise.all(
      (doc.participants ?? []).map(
        async (p: {
          _id?: unknown
          displayName: string
          userId?: unknown
          popId?: string
          confirmed?: boolean
          deckPokemonSlugs?: string[]
          tournamentDecklistRef?: {
            decklistId?: unknown
            listKind?: string
            variantId?: unknown
          }
        }) => {
          const userRef = p.userId
          let userId: string | null = null
          let userEmail = ''
          let userName = ''
          if (userRef && typeof userRef === 'object' && '_id' in userRef) {
            const u = userRef as {
              _id: unknown
              email?: string
              name?: string
              popid?: string
            }
            userId = String(u._id)
            userEmail = typeof u.email === 'string' ? u.email : ''
            userName = typeof u.name === 'string' ? u.name : ''
          } else if (userRef) {
            userId = String(userRef)
          }

          const deckPokemonSlugs = Array.isArray(p.deckPokemonSlugs)
            ? p.deckPokemonSlugs.filter(
                (s): s is string => typeof s === 'string' && s.trim().length > 0
              )
            : []

          const tournamentDecklistRef = serializeTournamentDecklistRef(
            p.tournamentDecklistRef
          )

          let tournamentDecklistDisplay: {
            decklistName: string
            listLabel: string
          } | null = null
          if (userId && tournamentDecklistRef) {
            tournamentDecklistDisplay =
              await getTournamentDecklistDisplayLabels(
                new mongoose.Types.ObjectId(userId),
                p.tournamentDecklistRef
              )
          }

          return {
            participantId: p._id != null ? String(p._id) : '',
            displayName: p.displayName,
            userId,
            userEmail,
            userName,
            popId: typeof p.popId === 'string' ? p.popId : '',
            confirmed: Boolean(p.confirmed),
            deckPokemonSlugs,
            tournamentDecklistRef,
            tournamentDecklistDisplay
          }
        }
      )
    )

    return NextResponse.json({
      event: {
        _id: String(doc._id),
        title: doc.title,
        startsAt: new Date(doc.startsAt).toISOString(),
        state:
          doc.state === 'schedule' ||
          doc.state === 'running' ||
          doc.state === 'close'
            ? doc.state
            : 'schedule',
        kind: doc.kind,
        game: doc.game,
        storeId:
          store?._id != null ? String(store._id) : String(doc.storeId ?? ''),
        storeName:
          typeof store?.name === 'string' ? store.name.trim() : 'Tienda',
        storeSlug: typeof store?.slug === 'string' ? store.slug : '',
        participants
      }
    })
  } catch (error) {
    console.error('GET /api/admin/owner/manual-report/events/[id]:', error)
    return NextResponse.json(
      { error: 'Error al cargar el evento' },
      { status: 500 }
    )
  }
}
