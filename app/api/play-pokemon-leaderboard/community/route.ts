import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import {
  PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID,
  playPokemonLeaderboardEnabled
} from '@/lib/play-pokemon-leaderboard/constants'
import { buildPlayPokemonCommunityRanking } from '@/lib/play-pokemon-leaderboard/build-community-ranking'
import type { PlayPokemonCommunityRankingResponse } from '@/lib/play-pokemon-leaderboard/types'

export const dynamic = 'force-dynamic'

const MIN_SEARCH_LENGTH = 2

export async function GET(request: NextRequest) {
  try {
    if (!playPokemonLeaderboardEnabled()) {
      return NextResponse.json(
        { enabled: false, error: 'Leaderboard deshabilitado' },
        { status: 503 }
      )
    }

    const storeId = request.nextUrl.searchParams.get('storeId')?.trim() ?? ''
    const isAllStores = storeId === PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID
    if (!isAllStores && !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ error: 'Tienda inválida' }, { status: 400 })
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
      storeId,
      page,
      search
    })

    const payload: PlayPokemonCommunityRankingResponse = {
      enabled: result.enabled,
      seasonLabel: result.seasonLabel,
      storeId: result.storeId,
      storeName: result.storeName,
      storeSlug: result.storeSlug,
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
