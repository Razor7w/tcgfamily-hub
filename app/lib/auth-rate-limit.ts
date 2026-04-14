/**
 * Límite en memoria (por instancia). Mitiga abuso básico sin Redis.
 */

function pruneTimestamps(timestamps: number[], windowMs: number, now: number) {
  return timestamps.filter(t => now - t < windowMs)
}

export function createSlidingWindowLimiter(options: {
  max: number
  windowMs: number
}) {
  const store = new Map<string, number[]>()

  return function isLimited(key: string): boolean {
    const now = Date.now()
    const raw = store.get(key) ?? []
    const recent = pruneTimestamps(raw, options.windowMs, now)
    recent.push(now)
    store.set(key, recent)
    return recent.length > options.max
  }
}
