export const PRECON_TIMER_MIN_MINUTES = 1
export const PRECON_TIMER_MAX_MINUTES = 240

export type PreconTimerStatus = 'idle' | 'running' | 'paused'

export type PreconTimerSnapshot = {
  token: string
  minutes: number
  status: PreconTimerStatus
  startedAt: number | null
  endsAt: number | null
  remainingMs: number
  round: number | null
  serverNow: number
}

export function readPreconTimerMinutes(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed)) return null
  if (parsed < PRECON_TIMER_MIN_MINUTES || parsed > PRECON_TIMER_MAX_MINUTES) {
    return null
  }
  return parsed
}

export function preconTimerRemainingMs(
  snapshot: Pick<
    PreconTimerSnapshot,
    'status' | 'startedAt' | 'endsAt' | 'remainingMs' | 'serverNow'
  >,
  fetchedAt: number,
  now = Date.now()
): number {
  if (
    snapshot.status !== 'running' ||
    snapshot.startedAt === null ||
    snapshot.endsAt === null
  ) {
    return Math.max(0, snapshot.remainingMs)
  }
  const skew = snapshot.serverNow - fetchedAt
  const elapsed = now + skew - snapshot.startedAt
  return Math.max(0, snapshot.endsAt - snapshot.startedAt - elapsed)
}

export function preconTimerStatusLabel(status: PreconTimerStatus): string {
  if (status === 'running') return 'En curso'
  if (status === 'paused') return 'En pausa'
  return 'Sin iniciar'
}

export function formatPreconCountdown(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${mm}:${ss}`
  return `${mm}:${ss}`
}
