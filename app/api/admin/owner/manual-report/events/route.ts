import { NextRequest, NextResponse } from 'next/server'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import { ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER } from '@/lib/admin-weekly-event-access'
import connectDB from '@/lib/mongodb'
import '@/models/Store'
import WeeklyEvent from '@/models/WeeklyEvent'

/** Torneos Pokémon oficiales de cualquier tienda (solo owner HQ). */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const { searchParams } = new URL(request.url)
    const storeIdRaw = searchParams.get('storeId')?.trim() ?? ''
    const limitRaw = searchParams.get('limit')
    const limit = Math.min(
      300,
      Math.max(1, Number.parseInt(limitRaw ?? '120', 10) || 120)
    )

    await connectDB()

    const filter: Record<string, unknown> = {
      ...ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER,
      kind: 'tournament',
      game: 'pokemon'
    }
    if (storeIdRaw) {
      filter.storeId = storeIdRaw
    }

    const rows = await WeeklyEvent.find(filter)
      .sort({ startsAt: -1 })
      .limit(limit)
      .populate({ path: 'storeId', select: 'name slug' })
      .select(
        'title startsAt state storeId participants maxParticipants pokemonSubtype'
      )
      .lean()

    const events = rows.map(ev => {
      const store =
        ev.storeId &&
        typeof ev.storeId === 'object' &&
        ev.storeId !== null &&
        'name' in ev.storeId
          ? (ev.storeId as { _id?: unknown; name?: string; slug?: string })
          : null
      return {
        _id: String(ev._id),
        title: ev.title,
        startsAt: new Date(ev.startsAt).toISOString(),
        state:
          ev.state === 'schedule' ||
          ev.state === 'running' ||
          ev.state === 'close'
            ? ev.state
            : 'schedule',
        storeId:
          store?._id != null ? String(store._id) : String(ev.storeId ?? ''),
        storeName:
          typeof store?.name === 'string' ? store.name.trim() : 'Tienda',
        storeSlug: typeof store?.slug === 'string' ? store.slug : '',
        participantCount: Array.isArray(ev.participants)
          ? ev.participants.length
          : 0,
        maxParticipants: ev.maxParticipants,
        pokemonSubtype: ev.pokemonSubtype ?? null
      }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('GET /api/admin/owner/manual-report/events:', error)
    return NextResponse.json(
      { error: 'Error al listar eventos' },
      { status: 500 }
    )
  }
}
