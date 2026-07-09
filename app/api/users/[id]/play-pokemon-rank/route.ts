import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { playPokemonLeaderboardEnabled } from '@/lib/play-pokemon-leaderboard/constants'
import { buildPublicPlayPokemonRankFromUser } from '@/lib/play-pokemon-leaderboard/build-public-play-pokemon-rank'
import mongoose from 'mongoose'

export type PublicPlayPokemonRankPayload = {
  visible: boolean
  rank?: number
  championshipPoints?: number
  playPoints?: number
  divisionLabel?: string
  seasonLabel?: string
  linkedDisplayName?: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!playPokemonLeaderboardEnabled()) {
      return NextResponse.json({
        visible: false
      } satisfies PublicPlayPokemonRankPayload)
    }

    const { id } = await params
    let userId: mongoose.Types.ObjectId
    try {
      userId = new mongoose.Types.ObjectId(id)
    } catch {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await connectDB()
    const user = await User.findById(userId)
      .select(
        'name playPokemonChampionshipPoints playPokemonChampionshipRank playPokemonPlayPoints playPokemonDivision playPokemonLinkedDisplayName playPokemonLeaderboardUpdatedAt playPokemonSeasonLabel playPokemonRankPublic'
      )
      .lean<{
        name?: string
        playPokemonChampionshipPoints?: number | null
        playPokemonChampionshipRank?: number | null
        playPokemonPlayPoints?: number | null
        playPokemonDivision?: 'masters' | 'seniors' | 'juniors' | null
        playPokemonLinkedDisplayName?: string | null
        playPokemonLeaderboardUpdatedAt?: Date | null
        playPokemonSeasonLabel?: string | null
        playPokemonRankPublic?: boolean
      } | null>()

    const badge = user ? buildPublicPlayPokemonRankFromUser(user) : null
    if (!badge) {
      return NextResponse.json({
        visible: false
      } satisfies PublicPlayPokemonRankPayload)
    }

    return NextResponse.json({
      visible: true,
      rank: badge.rank,
      championshipPoints: badge.championshipPoints,
      playPoints: badge.playPoints,
      divisionLabel: badge.divisionLabel,
      seasonLabel: badge.seasonLabel,
      linkedDisplayName: badge.linkedDisplayName
    } satisfies PublicPlayPokemonRankPayload)
  } catch (error) {
    console.error('GET /api/users/[id]/play-pokemon-rank:', error)
    return NextResponse.json(
      { error: 'Error al cargar ranking' },
      { status: 500 }
    )
  }
}
