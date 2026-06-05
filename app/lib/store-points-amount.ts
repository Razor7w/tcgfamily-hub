/** Decimales soportados en puntos de tienda (ej. descuento 6.5). */
export const STORE_POINTS_DECIMALS = 1

/** Normaliza cantidad de puntos; admite un decimal sin aproximar a entero. */
export function normalizeStorePointsAmount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const factor = 10 ** STORE_POINTS_DECIMALS
  return Math.round(n * factor) / factor
}
