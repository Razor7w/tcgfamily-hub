import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  PLAY_POKEMON_COMMUNITY_RANKING_PAGE_SIZE,
  playPokemonLeaderboardEnabled,
  playPokemonLeaderboardSeasonLabel,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'
import User from '@/models/User'

const DIVISION_LABELS: Record<PlayPokemonLeaderboardDivision, string> = {
  masters: 'Master',
  seniors: 'Senior',
  juniors: 'Junior'
}

type LeanPublicRankUser = {
  _id: mongoose.Types.ObjectId
  name?: string
  playPokemonChampionshipPoints?: number | null
  playPokemonChampionshipRank?: number | null
  playPokemonPlayPoints?: number | null
  playPokemonDivision?: PlayPokemonLeaderboardDivision | null
  playPokemonLinkedDisplayName?: string | null
  playPokemonLeaderboardUpdatedAt?: Date | null
  playPokemonSeasonLabel?: string | null
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

export async function buildPlayPokemonCommunityRanking(input: {
  division: PlayPokemonLeaderboardDivision
  page?: number
  pageSize?: number
  search?: string
}): Promise<{
  enabled: boolean
  seasonLabel: string
  division: PlayPokemonLeaderboardDivision
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

  if (!enabled) {
    return {
      enabled: false,
      seasonLabel,
      division: input.division,
      page,
      pageSize,
      count: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
      search,
      rows: []
    }
  }

  await connectDB()

  const filter: Record<string, unknown> = {
    playPokemonRankPublic: true,
    playPokemonChampionshipRank: { $gte: 1 },
    playPokemonChampionshipPoints: { $gte: 0 },
    playPokemonDivision: input.division
  }

  if (search.length >= 2) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { playPokemonLinkedDisplayName: pattern }]
  }

  const [count, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select(
        'name playPokemonChampionshipPoints playPokemonChampionshipRank playPokemonPlayPoints playPokemonDivision playPokemonLinkedDisplayName playPokemonLeaderboardUpdatedAt playPokemonSeasonLabel'
      )
      .sort({
        playPokemonChampionshipRank: 1,
        playPokemonChampionshipPoints: -1
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<LeanPublicRankUser[]>()
  ])

  const totalPages = count > 0 ? Math.ceil(count / pageSize) : 0
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : page

  const rows = users.map(user => {
    const division = user.playPokemonDivision ?? null
    const linked =
      typeof user.playPokemonLinkedDisplayName === 'string'
        ? user.playPokemonLinkedDisplayName.trim()
        : ''

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
          : null
    }
  })

  return {
    enabled: true,
    seasonLabel,
    division: input.division,
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
