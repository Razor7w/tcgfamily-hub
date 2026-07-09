import { NextRequest, NextResponse } from 'next/server'
import {
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  playPokemonLeaderboardEnabled,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import { buildPlayPokemonCommunityRanking } from '@/lib/play-pokemon-leaderboard/build-community-ranking'
import type { PlayPokemonCommunityRankingResponse } from '@/lib/play-pokemon-leaderboard/types'

export const dynamic = 'force-dynamic'

const MIN_SEARCH_LENGTH = 2

function parseDivision(
  raw: string | null
): PlayPokemonLeaderboardDivision | null {
  const v = raw?.trim().toLowerCase()
  if (!v) return 'masters'
  return (PLAY_POKEMON_LEADERBOARD_DIVISIONS as readonly string[]).includes(v)
    ? (v as PlayPokemonLeaderboardDivision)
    : null
}

export async function GET(request: NextRequest) {
  try {
    if (!playPokemonLeaderboardEnabled()) {
      return NextResponse.json(
        { enabled: false, error: 'Leaderboard deshabilitado' },
        { status: 503 }
      )
    }

    const division = parseDivision(request.nextUrl.searchParams.get('division'))
    if (!division) {
      return NextResponse.json(
        { error: 'División inválida. Usa masters, seniors o juniors.' },
        { status: 400 }
      )
    }

    const pageRaw = Number(request.nextUrl.searchParams.get('page') ?? '1')
    const page =
      Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

    const searchRaw =
      request.nextUrl.searchParams.get('q') ??
      request.nextUrl.searchParams.get('search') ??
      ''
    const search =
      searchRaw.trim().length >= MIN_SEARCH_LENGTH ? searchRaw.trim() : ''

    const result = await buildPlayPokemonCommunityRanking({
      division,
      page,
      search
    })

    const payload: PlayPokemonCommunityRankingResponse = {
      enabled: result.enabled,
      seasonLabel: result.seasonLabel,
      division: result.division,
      page: result.page,
      pageSize: result.pageSize,
      count: result.count,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrevious: result.hasPrevious,
      search,
      rows: result.rows
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('GET /api/play-pokemon-leaderboard/community:', error)
    return NextResponse.json(
      { error: 'No se pudo cargar el ranking de jugadores' },
      { status: 500 }
    )
  }
}
