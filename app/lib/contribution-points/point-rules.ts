import type { ContributionPointAction } from '@/lib/contribution-points/types'

export const DEFAULT_CONTRIBUTION_POINT_RULES: Record<
  ContributionPointAction,
  number
> = {
  own_deck_reported: 20,
  decklist_ref: 5,
  opponent_sprites: 6,
  round_complete: 4,
  mail_received_in_store: 3,
  mail_withdrawn_in_store: 3,
  tournament_pre_registered: 1,
  tournament_participated: 10
}

export type ContributionPointRules = Record<ContributionPointAction, number>

export function mergeContributionPointRules(
  overrides?: Partial<Record<ContributionPointAction, number>> | null
): ContributionPointRules {
  const merged = { ...DEFAULT_CONTRIBUTION_POINT_RULES }
  if (!overrides || typeof overrides !== 'object') return merged
  for (const key of Object.keys(
    DEFAULT_CONTRIBUTION_POINT_RULES
  ) as ContributionPointAction[]) {
    const raw = overrides[key]
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
    merged[key] = Math.min(999, Math.max(0, Math.round(raw)))
  }
  return merged
}

export function pointsForAction(
  action: ContributionPointAction,
  rules: ContributionPointRules
): number {
  return Math.max(0, Math.round(Number(rules[action]) || 0))
}
