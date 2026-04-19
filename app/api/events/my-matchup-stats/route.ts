import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import {
  aggregateMyDeckStats,
  aggregateOpponentMatchupsForMyDeck,
  myDeckSlugsDisplayOrderFromEvents,
  type TournamentOriginFilter
} from '@/lib/pokemon-matchup-stats'
import WeeklyEvent from '@/models/WeeklyEvent'

const MAX_EVENTS = 600

function parseOrigin(raw: string | null): TournamentOriginFilter {
  if (raw === 'official' || raw === 'custom') return raw
  return 'all'
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const origin = parseOrigin(url.searchParams.get('origin'))
    const myDeckKeyRaw = url.searchParams.get('myDeckKey')
    const myDeckKeyFilter =
      typeof myDeckKeyRaw === 'string' && myDeckKeyRaw.trim()
        ? decodeURIComponent(myDeckKeyRaw.trim())
        : null

    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(session.user.id)
    } catch {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()

    const docs = await WeeklyEvent.find({
      kind: 'tournament',
      game: 'pokemon',
      participants: { $elemMatch: { userId: uid } }
    })
      .sort({ startsAt: -1 })
      .limit(MAX_EVENTS)
      .select({ startsAt: 1, tournamentOrigin: 1, participants: 1 })
      .lean()

    if (myDeckKeyFilter != null) {
      const opponents = aggregateOpponentMatchupsForMyDeck(
        docs as Parameters<typeof aggregateOpponentMatchupsForMyDeck>[0],
        session.user.id,
        origin,
        myDeckKeyFilter
      )
      const myDeckSlugs =
        myDeckKeyFilter === '__empty__'
          ? []
          : myDeckSlugsDisplayOrderFromEvents(
              docs as Parameters<typeof aggregateMyDeckStats>[0],
              session.user.id,
              myDeckKeyFilter
            )
      return NextResponse.json(
        {
          origin,
          view: 'deck-detail' as const,
          myDeckKey: myDeckKeyFilter,
          myDeckSlugs,
          opponents,
          eventsScanned: docs.length
        },
        { status: 200 }
      )
    }

    const myDecks = aggregateMyDeckStats(
      docs as Parameters<typeof aggregateMyDeckStats>[0],
      session.user.id,
      origin
    )

    let eventsWithReportedRounds = 0
    for (const doc of docs) {
      const tor =
        (doc as { tournamentOrigin?: string }).tournamentOrigin === 'custom'
          ? 'custom'
          : 'official'
      if (origin === 'official' && tor !== 'official') continue
      if (origin === 'custom' && tor !== 'custom') continue
      const parts = doc.participants ?? []
      const mine = parts.find(
        (p: { userId?: unknown }) =>
          p?.userId != null && String(p.userId) === session.user.id
      ) as { matchRounds?: unknown[] } | undefined
      const n = Array.isArray(mine?.matchRounds) ? mine.matchRounds.length : 0
      if (n > 0) eventsWithReportedRounds++
    }

    return NextResponse.json(
      {
        origin,
        myDecks,
        eventsScanned: docs.length,
        eventsWithReportedRounds
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/events/my-matchup-stats:', error)
    return NextResponse.json(
      { error: 'Error al cargar estadísticas' },
      { status: 500 }
    )
  }
}
