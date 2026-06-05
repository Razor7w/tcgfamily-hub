import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { normalizeStorePointsAmount } from '@/lib/store-points-amount'

/** Valor de canje en CLP por punto en TCG Family. */
export const CLP_PER_TCGFAMILY_STORE_POINT = 1

/** Valor de canje en CLP por punto en tiendas asociadas (no TCG Family). */
export const CLP_PER_PARTNER_STORE_POINT = 1000

/** @deprecated Usar `clpPerStorePoint(storeSlug)`; equivale a tiendas asociadas. */
export const CLP_PER_STORE_POINT = CLP_PER_PARTNER_STORE_POINT

export function isTcgFamilyStoreSlug(slug: string | null | undefined): boolean {
  const s = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
  return s === DEFAULT_PRIMARY_STORE_SLUG
}

export function clpPerStorePoint(storeSlug?: string | null): number {
  return isTcgFamilyStoreSlug(storeSlug)
    ? CLP_PER_TCGFAMILY_STORE_POINT
    : CLP_PER_PARTNER_STORE_POINT
}

export function storePointClpEquivalenceLabel(
  storeSlug?: string | null
): string {
  return isTcgFamilyStoreSlug(storeSlug)
    ? '1 punto = $1 en canje'
    : '1 punto ≈ $1.000 en canje'
}

/** @deprecated Usar `storePointClpEquivalenceLabel(storeSlug)`. */
export const STORE_POINT_CLP_EQUIVALENCE_LABEL =
  storePointClpEquivalenceLabel(null)

/** Convierte cantidad de puntos a monto CLP formateado (es-CL). */
export function formatStorePointsClpEquivalent(
  points: number,
  storeSlug?: string | null
): string {
  const pts = Math.max(0, normalizeStorePointsAmount(points))
  const rate = clpPerStorePoint(storeSlug)
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(pts * rate)
}
