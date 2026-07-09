import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID,
  PLAY_POKEMON_COMMUNITY_RANKING_PAGE_SIZE,
  playPokemonLeaderboardEnabled,
  playPokemonLeaderboardSeasonLabel,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import User from '@/models/User'
import Store from '@/models/Store'

const DIVISION_LABELS: Record<PlayPokemonLeaderboardDivision, string> = {
  masters: 'Master',
  seniors: 'Senior',
  juniors: 'Junior'
}

const PUBLIC_RANK_USER_MATCH = {
  playPokemonRankPublic: true,
  playPokemonChampionshipRank: { $gte: 1 },
  playPokemonChampionshipPoints: { $gte: 0 },
  defaultStoreId: { $exists: true, $ne: null }
} as const

type LeanPublicRankUser = {
  _id: mongoose.Types.ObjectId
  name?: string
  defaultStoreId?: mongoose.Types.ObjectId | null
  playPokemonChampionshipPoints?: number | null
  playPokemonChampionshipRank?: number | null
  playPokemonPlayPoints?: number | null
  playPokemonDivision?: PlayPokemonLeaderboardDivision | null
  playPokemonLinkedDisplayName?: string | null
  playPokemonLeaderboardUpdatedAt?: Date | null
  playPokemonSeasonLabel?: string | null
}

export type PlayPokemonCommunityRankingStoreOption = {
  id: string
  name: string
  slug: string
  playerCount: number
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function displayNameForUser(user: LeanPublicRankUser): string {
  const name = typeof user.name === 'string' ? user.name.trim() : ''
  if (name) return name
  const linked =
    typeof user.playPokemonLinkedDisplayName === 'string'
      ? user.playPokemonLinkedDisplayName.trim()
      : ''
  return linked || 'Jugador'
}

export async function listPlayPokemonCommunityRankingStores(): Promise<
  PlayPokemonCommunityRankingStoreOption[]
> {
  if (!playPokemonLeaderboardEnabled()) return []

  await connectDB()

  const grouped = await User.aggregate<{
    _id: mongoose.Types.ObjectId
    playerCount: number
  }>([
    { $match: PUBLIC_RANK_USER_MATCH },
    { $group: { _id: '$defaultStoreId', playerCount: { $sum: 1 } } },
    { $sort: { playerCount: -1 } }
  ])

  if (grouped.length === 0) return []

  const storeIds = grouped.map(row => row._id)
  const stores = await Store.find({
    _id: { $in: storeIds },
    isActive: true
  })
    .select('name slug')
    .lean<Array<{ _id: mongoose.Types.ObjectId; name: string; slug: string }>>()

  const storeById = new Map(stores.map(s => [String(s._id), s]))
  const countById = new Map(grouped.map(g => [String(g._id), g.playerCount]))

  return storeIds
    .map(id => {
      const store = storeById.get(String(id))
      if (!store) return null
      return {
        id: String(id),
        name: store.name,
        slug: store.slug,
        playerCount: countById.get(String(id)) ?? 0
      }
    })
    .filter((row): row is PlayPokemonCommunityRankingStoreOption => row != null)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function buildPlayPokemonCommunityRanking(input: {
  storeId: string
  page?: number
  pageSize?: number
  search?: string
}): Promise<{
  enabled: boolean
  seasonLabel: string
  storeId: string
  storeName: string
  storeSlug: string
  page: number
  pageSize: number
  count: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  search: string
  rows: Array<{
    userId: string
    displayName: string
    championshipRank: number
    championshipPoints: number
    playPoints: number | null
    division: PlayPokemonLeaderboardDivision | null
    divisionLabel: string | null
    linkedDisplayName: string | null
    seasonLabel: string | null
    leaderboardUpdatedAt: string | null
    storeName: string | null
    storeSlug: string | null
  }>
}> {
  const enabled = playPokemonLeaderboardEnabled()
  const pageSize = Math.min(
    100,
    Math.max(1, input.pageSize ?? PLAY_POKEMON_COMMUNITY_RANKING_PAGE_SIZE)
  )
  const page = Math.max(1, Math.floor(input.page ?? 1))
  const search = input.search?.trim() ?? ''
  const seasonLabel = playPokemonLeaderboardSeasonLabel()
  const isAllStores =
    input.storeId === PLAY_POKEMON_COMMUNITY_RANKING_ALL_STORES_ID

  const emptyResponse = {
    enabled:
      enabled &&
      (isAllStores || mongoose.Types.ObjectId.isValid(input.storeId)),
    seasonLabel,
    storeId: input.storeId,
    storeName: isAllStores ? 'Todas las tiendas' : '',
    storeSlug: '',
    page,
    pageSize,
    count: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
    search,
    rows: [] as Array<{
      userId: string
      displayName: string
      championshipRank: number
      championshipPoints: number
      playPoints: number | null
      division: PlayPokemonLeaderboardDivision | null
      divisionLabel: string | null
      linkedDisplayName: string | null
      seasonLabel: string | null
      leaderboardUpdatedAt: string | null
      storeName: string | null
      storeSlug: string | null
    }>
  }

  if (!enabled) return { ...emptyResponse, enabled: false }

  if (!isAllStores && !mongoose.Types.ObjectId.isValid(input.storeId)) {
    return { ...emptyResponse, enabled: false }
  }

  await connectDB()

  let storeName = isAllStores ? 'Todas las tiendas' : ''
  let storeSlug = ''

  const filter: Record<string, unknown> = { ...PUBLIC_RANK_USER_MATCH }

  if (!isAllStores) {
    const storeOid = new mongoose.Types.ObjectId(input.storeId)
    const store = await Store.findOne({ _id: storeOid, isActive: true })
      .select('name slug')
      .lean<{ name: string; slug: string } | null>()

    if (!store) {
      return { ...emptyResponse, enabled: true }
    }

    storeName = store.name
    storeSlug = store.slug
    filter.defaultStoreId = storeOid
  }

  if (search.length >= 2) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { playPokemonLinkedDisplayName: pattern }]
  }

  const userSelect =
    'name defaultStoreId playPokemonChampionshipPoints playPokemonChampionshipRank playPokemonPlayPoints playPokemonDivision playPokemonLinkedDisplayName playPokemonLeaderboardUpdatedAt playPokemonSeasonLabel'

  const [count, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select(userSelect)
      .sort({
        playPokemonChampionshipRank: 1,
        playPokemonChampionshipPoints: -1
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<LeanPublicRankUser[]>()
  ])

  const storeById = new Map<string, { name: string; slug: string }>()
  if (isAllStores && users.length > 0) {
    const storeIds = [
      ...new Set(
        users
          .map(user =>
            user.defaultStoreId != null ? String(user.defaultStoreId) : null
          )
          .filter((id): id is string => id != null)
      )
    ]
    if (storeIds.length > 0) {
      const stores = await Store.find({
        _id: { $in: storeIds.map(id => new mongoose.Types.ObjectId(id)) },
        isActive: true
      })
        .select('name slug')
        .lean<
          Array<{ _id: mongoose.Types.ObjectId; name: string; slug: string }>
        >()
      for (const store of stores) {
        storeById.set(String(store._id), {
          name: store.name,
          slug: store.slug
        })
      }
    }
  }

  const totalPages = count > 0 ? Math.ceil(count / pageSize) : 0
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : page

  const rows = users.map(user => {
    const division = user.playPokemonDivision ?? null
    const linked =
      typeof user.playPokemonLinkedDisplayName === 'string'
        ? user.playPokemonLinkedDisplayName.trim()
        : ''
    const store =
      user.defaultStoreId != null
        ? storeById.get(String(user.defaultStoreId))
        : undefined

    return {
      userId: String(user._id),
      displayName: displayNameForUser(user),
      championshipRank: user.playPokemonChampionshipRank as number,
      championshipPoints: user.playPokemonChampionshipPoints as number,
      playPoints:
        typeof user.playPokemonPlayPoints === 'number'
          ? user.playPokemonPlayPoints
          : null,
      division,
      divisionLabel: division ? DIVISION_LABELS[division] : null,
      linkedDisplayName: linked || null,
      seasonLabel: user.playPokemonSeasonLabel?.trim() || seasonLabel,
      leaderboardUpdatedAt:
        user.playPokemonLeaderboardUpdatedAt instanceof Date
          ? user.playPokemonLeaderboardUpdatedAt.toISOString()
          : null,
      storeName: isAllStores ? (store?.name ?? null) : null,
      storeSlug: isAllStores ? (store?.slug ?? null) : null
    }
  })

  return {
    enabled: true,
    seasonLabel,
    storeId: input.storeId,
    storeName,
    storeSlug,
    page: safePage,
    pageSize,
    count,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrevious: safePage > 1,
    search,
    rows
  }
}
