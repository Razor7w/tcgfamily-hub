/** Posición manual en torneos custom (sin tabla importada). */

export type ManualPlacementDTO = {
  categoryIndex: number
  place: number | null
  isDnf: boolean
}

export function parseManualPlacementBody(
  raw: unknown
): ManualPlacementDTO | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const ci = o.categoryIndex
  if (typeof ci !== 'number' || !Number.isFinite(ci)) return null
  const idx = Math.round(ci)
  if (idx < 0 || idx > 2) return null
  const isDnf = o.isDnf === true
  if (isDnf) {
    return { categoryIndex: idx, place: null, isDnf: true }
  }
  const pl = o.place
  if (typeof pl !== 'number' || !Number.isFinite(pl)) return null
  const place = Math.max(1, Math.min(999, Math.round(pl)))
  return { categoryIndex: idx, place, isDnf: false }
}
