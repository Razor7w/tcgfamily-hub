export const TEAM_MEDAL_CATEGORIES = [
  'competitive',
  'community',
  'longevity'
] as const

export type TeamMedalCategory = (typeof TEAM_MEDAL_CATEGORIES)[number]

export type TeamMedalKind = 'dynamic' | 'awarded'

export type TeamMedalMetadata = {
  leagueName?: string
  leagueSlug?: string
  rank?: string
  monthLabel?: string
  seasonKey?: string
}

export type TeamMedalDTO = {
  slug: string
  instanceKey: string
  label: string
  description: string
  category: TeamMedalCategory
  tier: number
  kind: TeamMedalKind
  earnedAt: string | null
  metadata?: TeamMedalMetadata
}
