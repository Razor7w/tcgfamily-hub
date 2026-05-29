import type { IDashboardModuleSettings } from '@/models/DashboardModuleSettings'
import {
  DEFAULT_CONTRIBUTION_TIER_LABELS,
  DEFAULT_CONTRIBUTION_TIER_THRESHOLDS,
  normalizeContributionTierLabels,
  normalizeContributionTierThresholds
} from '@/lib/contribution-points/tiers'
import {
  DEFAULT_CONTRIBUTION_POINT_RULES,
  mergeContributionPointRules,
  type ContributionPointRules
} from '@/lib/contribution-points/point-rules'

export type ContributionPointsAdminSettings = {
  enabled: boolean
  tierThresholds: [number, number, number]
  tierLabels: [string, string, string]
  pointRules: ContributionPointRules
}

export const DEFAULT_CONTRIBUTION_POINTS_ADMIN: ContributionPointsAdminSettings =
  {
    enabled: false,
    tierThresholds: [...DEFAULT_CONTRIBUTION_TIER_THRESHOLDS],
    tierLabels: [...DEFAULT_CONTRIBUTION_TIER_LABELS],
    pointRules: { ...DEFAULT_CONTRIBUTION_POINT_RULES }
  }

function readRuleOverrides(
  doc: Partial<Pick<IDashboardModuleSettings, 'contributionPointRules'>> | null
): Partial<Record<keyof ContributionPointRules, number>> | undefined {
  const raw = doc?.contributionPointRules
  if (!raw || typeof raw !== 'object') return undefined
  const overrides = { ...(raw as Record<string, number>) }
  const legacyRegistered = overrides.mail_registered
  if (typeof legacyRegistered === 'number') {
    if (overrides.mail_received_in_store == null) {
      overrides.mail_received_in_store = legacyRegistered
    }
    if (overrides.mail_withdrawn_in_store == null) {
      overrides.mail_withdrawn_in_store = legacyRegistered
    }
  }
  delete overrides.mail_registered
  return overrides as Partial<Record<keyof ContributionPointRules, number>>
}

export function mergeContributionPointsAdmin(
  doc: Partial<
    Pick<
      IDashboardModuleSettings,
      | 'contributionPointsEnabled'
      | 'contributionTierThresholds'
      | 'contributionTierLabels'
      | 'contributionPointRules'
    >
  > | null
): ContributionPointsAdminSettings {
  if (!doc) return { ...DEFAULT_CONTRIBUTION_POINTS_ADMIN }
  return {
    enabled: doc.contributionPointsEnabled === true,
    tierThresholds: normalizeContributionTierThresholds(
      doc.contributionTierThresholds
    ),
    tierLabels: normalizeContributionTierLabels(doc.contributionTierLabels),
    pointRules: mergeContributionPointRules(readRuleOverrides(doc))
  }
}

export function validateContributionPointsAdmin(
  settings: ContributionPointsAdminSettings
): string | null {
  const [a, b, c] = settings.tierThresholds
  if (!(a < b && b < c)) {
    return 'Los umbrales de tier deben ser estrictamente crecientes (ej. 700, 1500, 5000).'
  }
  return null
}

export function applyContributionPointsAdminToDoc(
  doc: {
    contributionPointsEnabled: boolean
    contributionTierThresholds?: number[]
    contributionTierLabels?: string[]
    contributionPointRules?: Record<string, number>
    set: (key: string, value: unknown) => void
  },
  settings: ContributionPointsAdminSettings
): void {
  doc.contributionPointsEnabled = settings.enabled
  doc.contributionTierThresholds = [...settings.tierThresholds]
  doc.contributionTierLabels = [...settings.tierLabels]
  const overrides: Record<string, number> = {}
  for (const [key, value] of Object.entries(settings.pointRules)) {
    const defaultVal =
      DEFAULT_CONTRIBUTION_POINT_RULES[
        key as keyof typeof DEFAULT_CONTRIBUTION_POINT_RULES
      ]
    if (typeof defaultVal === 'number' && value !== defaultVal) {
      overrides[key] = value
    }
  }
  if (Object.keys(overrides).length > 0) {
    doc.contributionPointRules = overrides
  } else {
    doc.set('contributionPointRules', undefined)
  }
}

export function normalizeContributionPointsAdminBody(
  body: unknown
): ContributionPointsAdminSettings | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.enabled !== 'boolean') return null
  return {
    enabled: b.enabled,
    tierThresholds: normalizeContributionTierThresholds(b.tierThresholds),
    tierLabels: normalizeContributionTierLabels(b.tierLabels),
    pointRules: mergeContributionPointRules(
      b.pointRules as Partial<Record<keyof ContributionPointRules, number>>
    )
  }
}
