import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { playPokemonLeaderboardEnabled } from '@/lib/play-pokemon-leaderboard/constants'
import {
  buildLinkedChampionshipPointsPayload,
  readPlayPokemonLinkedFromUser
} from '@/lib/play-pokemon-leaderboard/linked-championship-points'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const enabled = playPokemonLeaderboardEnabled()

    await connectDB()
    const user = await User.findById(session.user.id)
      .select(
        'name playPokemonChampionshipPoints playPokemonChampionshipRank playPokemonPlayPoints playPokemonDivision playPokemonLinkedDisplayName playPokemonLeaderboardUpdatedAt playPokemonSeasonPeriod playPokemonSeasonLabel playPokemonRankPublic playPokemonHistory'
      )
      .lean<{
        name?: string
        playPokemonChampionshipPoints?: number | null
        playPokemonChampionshipRank?: number | null
        playPokemonPlayPoints?: number | null
        playPokemonDivision?: 'masters' | 'seniors' | 'juniors' | null
        playPokemonLinkedDisplayName?: string | null
        playPokemonLeaderboardUpdatedAt?: Date | null
      } | null>()

    const linked = readPlayPokemonLinkedFromUser(user ?? {})
    const payload = buildLinkedChampionshipPointsPayload({ enabled, linked })
    return NextResponse.json(payload)
  } catch (error) {
    console.error('GET /api/me/championship-points:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar los Championship Points' },
      { status: 500 }
    )
  }
}
