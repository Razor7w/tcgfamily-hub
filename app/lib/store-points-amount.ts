/** Decimales soportados en puntos de tienda (ej. descuento 6.5). */
export const STORE_POINTS_DECIMALS = 1

/** Paso mínimo de canje de puntos por torneo (0.5). */
export const TOURNAMENT_POINTS_REDEEM_STEP = 0.5

/** Normaliza cantidad de puntos; admite un decimal sin aproximar a entero. */
export function normalizeStorePointsAmount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const factor = 10 ** STORE_POINTS_DECIMALS
  return Math.round(n * factor) / factor
}

/** True si la cantidad es un múltiplo positivo de 0.5 (0.5, 1, 1.5, …). */
export function isTournamentPointsRedeemStep(value: unknown): boolean {
  const n = normalizeStorePointsAmount(value)
  if (n < TOURNAMENT_POINTS_REDEEM_STEP) return false
  const doubled = normalizeStorePointsAmount(n * 2)
  return Number.isInteger(doubled)
}
