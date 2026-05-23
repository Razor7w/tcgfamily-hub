/** Valor de canje en pesos chilenos por cada punto de tienda. */
export const CLP_PER_STORE_POINT = 1000

export const STORE_POINT_CLP_EQUIVALENCE_LABEL = '1 punto ≈ $1.000 en canje'

/** Convierte cantidad de puntos a monto CLP formateado (es-CL). */
export function formatStorePointsClpEquivalent(points: number): string {
  const pts = Math.max(0, Math.round(Number(points) || 0))
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(pts * CLP_PER_STORE_POINT)
}
