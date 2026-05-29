export const DEFAULT_CONTRIBUTION_TIER_THRESHOLDS = [700, 1500, 5000] as const

export const DEFAULT_CONTRIBUTION_TIER_LABELS = [
  'Colaborador emergente',
  'Colaborador destacado',
  'Colaborador estrella'
] as const

export type ContributionTierIndex = 0 | 1 | 2

export type ContributionTierProgress = {
  totalPoints: number
  thresholds: [number, number, number]
  labels: [string, string, string]
  /** Índice del tier alcanzado (0–2), -1 si aún no llega al primero. */
  currentTierIndex: number
  /** Próximo umbral; null si ya está en el tier máximo. */
  nextThreshold: number | null
  /** 0–100 hacia el siguiente tier (100 si tier máximo). */
  progressPercent: number
}

export function normalizeContributionTierThresholds(
  raw: unknown
): [number, number, number] {
  const defaults = [...DEFAULT_CONTRIBUTION_TIER_THRESHOLDS] as [
    number,
    number,
    number
  ]
  if (!Array.isArray(raw) || raw.length !== 3) return defaults
  const nums = raw.map(v =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(999_999, Math.max(1, Math.round(v)))
      : null
  )
  if (nums.some(n => n == null)) return defaults
  const [a, b, c] = nums as [number, number, number]
  if (!(a < b && b < c)) return defaults
  return [a, b, c]
}

export function normalizeContributionTierLabels(
  raw: unknown
): [string, string, string] {
  const defaults = [...DEFAULT_CONTRIBUTION_TIER_LABELS] as [
    string,
    string,
    string
  ]
  if (!Array.isArray(raw) || raw.length !== 3) return defaults
  const labels = raw.map((v, i) => {
    if (typeof v !== 'string') return defaults[i]
    const t = v.trim().slice(0, 60)
    return t || defaults[i]
  }) as [string, string, string]
  return labels
}

export function buildContributionTierProgress(
  totalPoints: number,
  thresholds: [number, number, number],
  labels: [string, string, string]
): ContributionTierProgress {
  const total = Math.max(0, Math.round(Number(totalPoints) || 0))
  let currentTierIndex = -1
  for (let i = 0; i < thresholds.length; i++) {
    if (total >= thresholds[i]) currentTierIndex = i
  }

  if (currentTierIndex >= thresholds.length - 1) {
    return {
      totalPoints: total,
      thresholds,
      labels,
      currentTierIndex: thresholds.length - 1,
      nextThreshold: null,
      progressPercent: 100
    }
  }

  const nextIndex = currentTierIndex + 1
  const nextThreshold = thresholds[nextIndex]
  const prevThreshold = currentTierIndex >= 0 ? thresholds[currentTierIndex] : 0
  const span = nextThreshold - prevThreshold
  const progress = span > 0 ? ((total - prevThreshold) / span) * 100 : 0

  return {
    totalPoints: total,
    thresholds,
    labels,
    currentTierIndex,
    nextThreshold,
    progressPercent: Math.min(100, Math.max(0, Math.round(progress)))
  }
}
