import { NextRequest, NextResponse } from 'next/server'
import {
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  playPokemonLeaderboardEnabled,
  playPokemonLeaderboardPeriod,
  playPokemonLeaderboardPublicUrl,
  playPokemonLeaderboardRegion,
  playPokemonLeaderboardRegionType,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import {
  fetchPlayPokemonLeaderboardPage,
  fetchPlayPokemonLeaderboardSnapshot
} from '@/lib/play-pokemon-leaderboard/fetch-leaderboard-snapshot'
import { normalizePlayPokemonDisplayName } from '@/lib/play-pokemon-leaderboard/normalize-display-name'
import type {
  PlayPokemonChileLeaderboardResponse,
  PlayPokemonChileLeaderboardRow,
  PlayPokemonLeaderboardRow
} from '@/lib/play-pokemon-leaderboard/types'

export const dynamic = 'force-dynamic'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200
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

function parseSearchQuery(raw: string | null): string {
  const trimmed = raw?.trim() ?? ''
  if (trimmed.length < MIN_SEARCH_LENGTH) return ''
  return normalizePlayPokemonDisplayName(trimmed)
}

function mapRow(
  row: PlayPokemonLeaderboardRow
): PlayPokemonChileLeaderboardRow {
  return {
    rank: row.rank,
    displayName: row.display_name,
    championshipPoints: row.primary_point_total,
    playPoints: row.secondary_point_total,
    playerCountryCode: row.player_country_code,
    calculationDate: row.calculation_date
  }
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

    const pageSizeRaw = Number(
      request.nextUrl.searchParams.get('pageSize') ??
        request.nextUrl.searchParams.get('page_size') ??
        String(DEFAULT_PAGE_SIZE)
    )
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSizeRaw)))
      : DEFAULT_PAGE_SIZE

    const period = playPokemonLeaderboardPeriod()
    const region = playPokemonLeaderboardRegion()
    const regionType = playPokemonLeaderboardRegionType()
    const searchRaw =
      request.nextUrl.searchParams.get('q') ??
      request.nextUrl.searchParams.get('search') ??
      ''
    const search = parseSearchQuery(searchRaw)

    let count = 0
    let totalPages = 0
    let rows: PlayPokemonChileLeaderboardRow[] = []
    let hasNext = false
    let hasPrevious = false
    let calculationDate: string | undefined

    if (search) {
      const snapshot = await fetchPlayPokemonLeaderboardSnapshot({
        period,
        region,
        regionType,
        division
      })
      const filtered = snapshot.filter(row =>
        normalizePlayPokemonDisplayName(row.display_name).includes(search)
      )
      count = filtered.length
      totalPages = count > 0 ? Math.ceil(count / pageSize) : 0
      const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1
      const start = (safePage - 1) * pageSize
      rows = filtered.slice(start, start + pageSize).map(mapRow)
      hasNext = safePage < totalPages
      hasPrevious = safePage > 1
      calculationDate =
        rows[0]?.calculationDate ?? filtered[0]?.calculation_date
    } else {
      const data = await fetchPlayPokemonLeaderboardPage({
        period,
        region,
        regionType,
        division,
        page,
        pageSize
      })
      count = data.count ?? 0
      totalPages = count > 0 ? Math.ceil(count / pageSize) : 0
      rows = (data.results ?? []).map(mapRow)
      hasNext = Boolean(data.next)
      hasPrevious = Boolean(data.previous)
      calculationDate = rows[0]?.calculationDate
    }

    const payload: PlayPokemonChileLeaderboardResponse = {
      enabled: true,
      division,
      region,
      regionType,
      period,
      page: search && totalPages > 0 ? Math.min(page, totalPages) : page,
      pageSize,
      count,
      totalPages,
      hasNext,
      hasPrevious,
      calculationDate,
      officialLeaderboardUrl: playPokemonLeaderboardPublicUrl(),
      search:
        searchRaw.trim().length >= MIN_SEARCH_LENGTH ? searchRaw.trim() : '',
      rows
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('GET /api/play-pokemon-leaderboard/chile:', error)
    return NextResponse.json(
      { error: 'No se pudo cargar el ranking de Chile' },
      { status: 500 }
    )
  }
}
