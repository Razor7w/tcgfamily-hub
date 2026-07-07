import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildMyTournamentWeekItemFromLean } from '@/lib/build-my-tournament-week-item'
import { aggregateWeeklyEventsForUserReport } from '@/lib/weekly-event-user-report-query'

const DEFAULT_LIMIT = 2
const MAX_LIMIT = 5
/** Margen para compensar torneos filtrados tras el aggregate. */
const RECENT_FETCH_BUFFER = 24

/**
 * Últimos torneos en los que participa el usuario (por fecha de inicio, más recientes primero).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id as string
    const userPopId =
      typeof (session.user as { popid?: string }).popid === 'string'
        ? (session.user as { popid: string }).popid
        : ''

    let limit = DEFAULT_LIMIT
    const rawLimit = request.nextUrl.searchParams.get('limit')
    if (rawLimit != null) {
      const n = Number.parseInt(rawLimit, 10)
      if (Number.isFinite(n) && n >= 1 && n <= MAX_LIMIT) {
        limit = n
      }
    }

    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(userId)
    } catch {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    await connectDB()

    const docs = await aggregateWeeklyEventsForUserReport(
      {
        kind: 'tournament',
        participants: { $elemMatch: { userId: uid } }
      },
      uid,
      {
        sort: { startsAt: -1 },
        limit: Math.min(RECENT_FETCH_BUFFER, Math.max(limit * 8, limit))
      }
    )

    const tournaments = []
    for (const d of docs) {
      const item = buildMyTournamentWeekItemFromLean(d, userId, userPopId, {
        skipPlayedGate: true
      })
      if (!item) continue
      tournaments.push(item)
      if (tournaments.length >= limit) break
    }

    return NextResponse.json({ tournaments }, { status: 200 })
  } catch (error) {
    console.error('GET /api/events/my-recent-tournaments:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneos' },
      { status: 500 }
    )
  }
}
