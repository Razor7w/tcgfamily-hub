import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { playPokemonLeaderboardEnabled } from '@/lib/play-pokemon-leaderboard/constants'
import {
  buildLinkedChampionshipPointsPayload,
  readPlayPokemonLinkedFromUser
} from '@/lib/play-pokemon-leaderboard/linked-championship-points'
import { applyPlayPokemonLinkRow } from '@/lib/play-pokemon-leaderboard/season-history'
import {
  findPlayPokemonChileLeaderboardRow,
  parseLinkDivision
} from '@/lib/play-pokemon-leaderboard/link-row'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!playPokemonLeaderboardEnabled()) {
      return NextResponse.json(
        { error: 'Leaderboard deshabilitado' },
        { status: 503 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    const { division, rank, displayName } = (body ?? {}) as Record<
      string,
      unknown
    >

    const parsedDivision = parseLinkDivision(division)
    const parsedRank =
      typeof rank === 'number'
        ? rank
        : typeof rank === 'string' && /^\d+$/.test(rank.trim())
          ? Number(rank.trim())
          : NaN
    const parsedName = typeof displayName === 'string' ? displayName.trim() : ''

    if (!parsedDivision || !parsedName || !Number.isInteger(parsedRank)) {
      return NextResponse.json(
        { error: 'Faltan division, rank o displayName válidos.' },
        { status: 400 }
      )
    }

    await connectDB()
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const row = await findPlayPokemonChileLeaderboardRow({
      division: parsedDivision,
      rank: parsedRank,
      displayName: parsedName
    })

    if (!row) {
      return NextResponse.json(
        {
          error:
            'No encontramos esa fila en el ranking actual. Reintenta desde Ranking Chile.'
        },
        { status: 404 }
      )
    }

    applyPlayPokemonLinkRow(user, { row, division: parsedDivision })
    await user.save()

    const linked = readPlayPokemonLinkedFromUser({
      name: user.name,
      playPokemonLinkedDisplayName: user.playPokemonLinkedDisplayName,
      playPokemonChampionshipPoints: user.playPokemonChampionshipPoints,
      playPokemonChampionshipRank: user.playPokemonChampionshipRank,
      playPokemonPlayPoints: user.playPokemonPlayPoints,
      playPokemonDivision: user.playPokemonDivision,
      playPokemonLeaderboardUpdatedAt: user.playPokemonLeaderboardUpdatedAt,
      playPokemonSeasonPeriod: user.playPokemonSeasonPeriod,
      playPokemonSeasonLabel: user.playPokemonSeasonLabel,
      playPokemonRankPublic: user.playPokemonRankPublic,
      playPokemonHistory: user.playPokemonHistory
    })

    return NextResponse.json(
      buildLinkedChampionshipPointsPayload({ enabled: true, linked })
    )
  } catch (error) {
    console.error('POST /api/me/championship-points/link:', error)
    return NextResponse.json(
      { error: 'No se pudieron vincular tus Championship Points' },
      { status: 500 }
    )
  }
}
