import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { buildPlayerSeasonSummary } from '@/lib/player-season-summary'
import { parseSeasonPeriod } from '@/lib/player-season-summary-types'
import type { TournamentOriginFilter } from '@/lib/pokemon-matchup-stats'

function parseOrigin(raw: string | null): TournamentOriginFilter {
  if (raw === 'official' || raw === 'custom') return raw
  return 'all'
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = parseSeasonPeriod(searchParams.get('period'))
    const origin = parseOrigin(searchParams.get('origin'))

    let uid: mongoose.Types.ObjectId
    try {
      uid = new mongoose.Types.ObjectId(session.user.id)
    } catch {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()

    const payload = await buildPlayerSeasonSummary(
      session.user.id,
      uid,
      period,
      origin
    )

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('GET /api/events/my-season-summary:', error)
    return NextResponse.json(
      { error: 'Error al cargar el resumen de temporada' },
      { status: 500 }
    )
  }
}
