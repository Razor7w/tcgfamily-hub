import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import WeeklyEvent from '@/models/WeeklyEvent'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import {
  buildTournamentStandingsPublic,
  type TournamentStandingLean
} from '@/lib/weekly-event-public'

function normSlug(s: string) {
  return s.trim().toLowerCase()
}

/**
 * Último torneo cerrado de la tienda (por `startsAt`) con top 4 por categoría publicado.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? normSlug(raw) : ''
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    await connectDB()

    const [storeLean, primary] = await Promise.all([
      Store.findOne({ slug, isActive: true })
        .select('_id name')
        .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>(),
      memoPrimaryTcgfamilyStoreObjectId()
    ])

    if (!storeLean) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }
    const storeScope = mongoFilterByStore(storeLean._id, primary) as Record<
      string,
      unknown
    >

    const candidates = await WeeklyEvent.find({
      kind: 'tournament',
      state: 'close',
      ...storeScope
    })
      .sort({ startsAt: -1 })
      .limit(12)
      .select(
        'title startsAt tournamentStandings participants.displayName participants.popId'
      )
      .lean()

    for (const doc of candidates) {
      const participants = Array.isArray(doc.participants)
        ? doc.participants.map(p => ({
            displayName:
              typeof p.displayName === 'string' ? p.displayName : '—',
            popId: typeof p.popId === 'string' ? p.popId : undefined
          }))
        : []

      const { standingsTopByCategory } = buildTournamentStandingsPublic(
        doc.tournamentStandings as TournamentStandingLean[] | undefined,
        participants,
        undefined,
        undefined
      )

      if (standingsTopByCategory.length === 0) continue

      const startsAt =
        doc.startsAt instanceof Date
          ? doc.startsAt.toISOString()
          : new Date(doc.startsAt as unknown as string).toISOString()

      return NextResponse.json({
        store: {
          name: typeof storeLean.name === 'string' ? storeLean.name.trim() : ''
        },
        tournament: {
          _id: String(doc._id),
          title: typeof doc.title === 'string' ? doc.title : 'Torneo',
          startsAt,
          standingsTopByCategory
        }
      })
    }

    return NextResponse.json({
      store: {
        name: typeof storeLean.name === 'string' ? storeLean.name.trim() : ''
      },
      tournament: null
    })
  } catch (error) {
    console.error('GET /api/stores/[slug]/last-finished-tournament:', error)
    return NextResponse.json(
      { error: 'Error al cargar el torneo' },
      { status: 500 }
    )
  }
}
