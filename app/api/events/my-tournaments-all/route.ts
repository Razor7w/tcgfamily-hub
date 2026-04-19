import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildMyTournamentWeekItemFromLean } from '@/lib/build-my-tournament-week-item'
import WeeklyEvent from '@/models/WeeklyEvent'

const MAX_RESULTS = 500

/**
 * Todos los torneos en los que el usuario participa (inscripción con userId),
 * más recientes primero por fecha de inicio. Sin ventana de semana.
 */
export async function GET() {
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
      .limit(MAX_RESULTS)
      .lean()

    const items = docs
      .map(d => buildMyTournamentWeekItemFromLean(d, userId, userPopId))
      .filter((x): x is NonNullable<typeof x> => x != null)

    return NextResponse.json({ tournaments: items }, { status: 200 })
  } catch (error) {
    console.error('GET /api/events/my-tournaments-all:', error)
    return NextResponse.json(
      { error: 'Error al obtener torneos' },
      { status: 500 }
    )
  }
}
