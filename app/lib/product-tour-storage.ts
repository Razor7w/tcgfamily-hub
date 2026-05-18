export const PRODUCT_TOUR_KEYS = {
  dashboard: 'tcg-tour-dashboard-v1',
  storeHub: 'tcg-tour-store-hub-v1'
} as const

export type ProductTourKey =
  (typeof PRODUCT_TOUR_KEYS)[keyof typeof PRODUCT_TOUR_KEYS]

export type ProductTourOutcome = 'done' | 'skipped'

export function isProductTourCompleted(tourKey: ProductTourKey): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = localStorage.getItem(tourKey)
    return v === 'done' || v === 'skipped'
  } catch {
    return true
  }
}

export function markProductTourCompleted(
  tourKey: ProductTourKey,
  outcome: ProductTourOutcome
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(tourKey, outcome)
  } catch {
    // privado / incógnito
  }
}
