import type {
  ContributionPointAction,
  ContributionPointCategory
} from '@/lib/contribution-points/types'

export type ContributionPointsAwardedItem = {
  category: ContributionPointCategory
  action: ContributionPointAction
  points: number
  awarded: boolean
}

export type ContributionTierProgressPublic = {
  totalPoints: number
  thresholds: [number, number, number]
  labels: [string, string, string]
  baseTierLabel: string
  currentTierIndex: number
  nextThreshold: number | null
  progressPercent: number
}

export type MyContributionPointsByCategory = {
  tournament: number
  tournament_deck: number
  tournament_log: number
  mail: number
}

export type MyContributionPointsEntry = {
  id: string
  category: ContributionPointCategory
  categoryLabel: string
  action: string
  points: number
  createdAt: string
  metadata?: Record<string, unknown>
}

export type MyContributionPointsData = {
  enabled: boolean
  totalPoints: number
  monthPoints: number
  monthLabel: string
  byCategory: MyContributionPointsByCategory
  tier: ContributionTierProgressPublic
  recentEntries: MyContributionPointsEntry[]
}

export type ContributionLeaderboardPeriod = 'month' | 'all'

export type SaveWithContributionPointsResponse = {
  contributionPointsAwarded?: ContributionPointsAwardedItem[]
}

export type ContributionLeaderboardRow = {
  rank: number
  userId: string
  displayName: string
  totalPoints: number
  tierLabel: string
  hideBadge: boolean
  playPokemonRank?: {
    rank: number
    championshipPoints: number
    playPoints?: number
    divisionLabel?: string
    seasonLabel?: string
    linkedDisplayName?: string
  } | null
}
