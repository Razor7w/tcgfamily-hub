import {
  PLAY_POKEMON_LEADERBOARD_CACHE_TTL_MS,
  PLAY_POKEMON_LEADERBOARD_PAGE_SIZE,
  PLAY_POKEMON_SPAR_BASE,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import type {
  PlayPokemonLeaderboardApiPage,
  PlayPokemonLeaderboardRow
} from '@/lib/play-pokemon-leaderboard/types'

type SnapshotCacheEntry = {
  expiresAt: number
  rows: PlayPokemonLeaderboardRow[]
}

const snapshotCache = new Map<string, SnapshotCacheEntry>()

function cacheKey(input: {
  period: string
  region: string
  regionType: string
  division: PlayPokemonLeaderboardDivision
  pointType: string
}): string {
  return [
    input.period,
    input.region,
    input.regionType,
    input.division,
    input.pointType
  ].join('|')
}

function buildLeaderboardUrl(input: {
  period: string
  region: string
  regionType: string
  division: PlayPokemonLeaderboardDivision
  pointType: string
  page: number
  pageSize?: number
}): string {
  const url = new URL(PLAY_POKEMON_SPAR_BASE)
  url.searchParams.set('product', 'tcg')
  url.searchParams.set('region', input.region)
  url.searchParams.set('region_type', input.regionType)
  url.searchParams.set('division', input.division)
  url.searchParams.set('period', input.period)
  url.searchParams.set('point_type', input.pointType)
  url.searchParams.set('sort_by', 'ranking_order:asc')
  url.searchParams.set(
    'page_size',
    String(input.pageSize ?? PLAY_POKEMON_LEADERBOARD_PAGE_SIZE)
  )
  url.searchParams.set('page', String(input.page))
  return url.toString()
}

async function fetchLeaderboardPage(
  input: Parameters<typeof buildLeaderboardUrl>[0]
): Promise<PlayPokemonLeaderboardApiPage> {
  const res = await fetch(buildLeaderboardUrl(input), {
    next: { revalidate: 21_600 }
  })
  if (!res.ok) {
    throw new Error(
      `Play! Pokémon leaderboard HTTP ${res.status} (${input.division} p${input.page})`
    )
  }
  return res.json() as Promise<PlayPokemonLeaderboardApiPage>
}

export async function fetchPlayPokemonLeaderboardPage(input: {
  period: string
  region: string
  regionType: string
  division: PlayPokemonLeaderboardDivision
  pointType?: string
  page: number
  pageSize?: number
}): Promise<PlayPokemonLeaderboardApiPage> {
  const pointType = input.pointType?.trim() || 'championship'
  return fetchLeaderboardPage({
    period: input.period,
    region: input.region,
    regionType: input.regionType,
    division: input.division,
    pointType,
    page: input.page,
    pageSize: input.pageSize
  })
}

export async function fetchPlayPokemonLeaderboardSnapshot(input: {
  period: string
  region: string
  regionType: string
  division: PlayPokemonLeaderboardDivision
  pointType?: string
}): Promise<PlayPokemonLeaderboardRow[]> {
  const pointType = input.pointType?.trim() || 'championship'
  const key = cacheKey({
    period: input.period,
    region: input.region,
    regionType: input.regionType,
    division: input.division,
    pointType
  })
  const now = Date.now()
  const cached = snapshotCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.rows
  }

  const rows: PlayPokemonLeaderboardRow[] = []
  let page = 1
  while (true) {
    const data = await fetchLeaderboardPage({
      period: input.period,
      region: input.region,
      regionType: input.regionType,
      division: input.division,
      pointType,
      page
    })
    rows.push(...(data.results ?? []))
    if (!data.next) break
    page += 1
    if (page > 200) {
      throw new Error(
        `Play! Pokémon leaderboard pagination exceeded safety limit (${input.division})`
      )
    }
  }

  snapshotCache.set(key, {
    rows,
    expiresAt: now + PLAY_POKEMON_LEADERBOARD_CACHE_TTL_MS
  })
  return rows
}

export async function findPlayPokemonLeaderboardRow(input: {
  period: string
  region: string
  regionType: string
  division: PlayPokemonLeaderboardDivision
  pointType?: string
  matches: (row: PlayPokemonLeaderboardRow) => boolean
}): Promise<PlayPokemonLeaderboardRow | null> {
  const pointType = input.pointType?.trim() || 'championship'
  const key = cacheKey({
    period: input.period,
    region: input.region,
    regionType: input.regionType,
    division: input.division,
    pointType
  })
  const now = Date.now()
  const cached = snapshotCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.rows.find(input.matches) ?? null
  }

  const rows: PlayPokemonLeaderboardRow[] = []
  let page = 1
  while (true) {
    const data = await fetchLeaderboardPage({
      period: input.period,
      region: input.region,
      regionType: input.regionType,
      division: input.division,
      pointType,
      page
    })
    const batch = data.results ?? []
    rows.push(...batch)
    const hit = batch.find(input.matches)
    if (hit) {
      snapshotCache.set(key, {
        rows,
        expiresAt: now + PLAY_POKEMON_LEADERBOARD_CACHE_TTL_MS
      })
      return hit
    }
    if (!data.next) break
    page += 1
    if (page > 200) {
      throw new Error(
        `Play! Pokémon leaderboard pagination exceeded safety limit (${input.division})`
      )
    }
  }

  snapshotCache.set(key, {
    rows,
    expiresAt: now + PLAY_POKEMON_LEADERBOARD_CACHE_TTL_MS
  })
  return null
}
