import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import {
  getOrBuildMatchupStatsDeckDetail,
  getOrBuildMatchupStatsOverview
} from '@/lib/matchup-stats-cache'
import type { TournamentOriginFilter } from '@/lib/pokemon-matchup-stats'

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

    if (myDeckKeyFilter != null) {
      const payload = await getOrBuildMatchupStatsDeckDetail(
        session.user.id,
        uid,
        origin,
        myDeckKeyFilter
      )
      return NextResponse.json(payload, {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
        }
      })
    }

    const payload = await getOrBuildMatchupStatsOverview(
      session.user.id,
      uid,
      origin
    )

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    console.error('GET /api/events/my-matchup-stats:', error)
    return NextResponse.json(
      { error: 'Error al cargar estadísticas' },
      { status: 500 }
    )
  }
}
