import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildMyTournamentWeekItemFromLean } from '@/lib/build-my-tournament-week-item'
import WeeklyEvent from '@/models/WeeklyEvent'

const DEFAULT_LIMIT = 2
const MAX_LIMIT = 5

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

    const docs = await WeeklyEvent.find({
      kind: 'tournament',
      participants: { $elemMatch: { userId: uid } }
    })
      .sort({ startsAt: -1 })
      .limit(limit)
      .lean()

    const tournaments = docs
      .map(d => buildMyTournamentWeekItemFromLean(d, userId, userPopId))
      .filter((x): x is NonNullable<typeof x> => x != null)

    return NextResponse.json({ tournaments }, { status: 200 })
  } catch (error) {
    console.error('GET /api/events/my-recent-tournaments:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneos' },
      { status: 500 }
    )
  }
}
