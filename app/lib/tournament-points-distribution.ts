/** Cabeza de reparto estándar (top 4) cuando hay suficientes puestos. */
const HEAD_POINTS = [5, 3, 2, 2] as const

/** Mitad de jugadores redondeada hacia arriba (19 → 10). */
export function defaultTopCount(playerCount: number): number {
  const n = Math.max(0, Math.round(playerCount))
  if (n <= 0) return 0
  return Math.ceil(n / 2)
}

/**
 * Reparte `playerCount` puntos (1 por jugador inscrito) entre `topCount` puestos.
 * Ej. 16 jugadores, top 8 → [5,3,2,2,1,1,1,1] (suma 16).
 */
export function computeTournamentPointsDistribution(
  playerCount: number,
  topCount: number
): number[] {
  const total = Math.max(0, Math.round(playerCount))
  const top = Math.max(0, Math.min(Math.round(topCount), total))
  if (top === 0) return []

  const pts = new Array<number>(top).fill(1)
  for (let i = 0; i < Math.min(HEAD_POINTS.length, top); i++) {
    pts[i] = HEAD_POINTS[i]!
  }

  const sum = pts.reduce((a, b) => a + b, 0)
  let diff = total - sum

  while (diff > 0) {
    pts[0]!++
    diff--
  }

  let i = top - 1
  while (diff < 0 && i >= 0) {
    const take = Math.min(pts[i]!, -diff)
    pts[i]! -= take
    diff += take
    i--
  }

  return pts
}
