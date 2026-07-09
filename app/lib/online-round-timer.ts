import { eventSupportsMatchChat } from '@/lib/tournament-mode'

export const ONLINE_ROUND_TIME_MIN = 5
export const ONLINE_ROUND_TIME_MAX = 180
export const ONLINE_ROUND_TIME_DEFAULT = 50

export type OnlineRoundTimerPayload = {
  roundNum: number
  minutes: number
  startedAt: string
  endsAt: string
}

type SnapshotLean = {
  roundNum?: number
  syncedAt?: Date | string
}

export function clampOnlineRoundTimeMinutes(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0
  const n =
    typeof raw === 'number' && Number.isFinite(raw)
      ? Math.round(raw)
      : typeof raw === 'string' && raw.trim() !== ''
        ? Math.round(Number(raw.trim()))
        : NaN
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.max(ONLINE_ROUND_TIME_MIN, Math.min(ONLINE_ROUND_TIME_MAX, n))
}

export function roundSnapshotStartedAt(
  snapshots: SnapshotLean[] | undefined,
  roundNum: number
): Date | null {
  const snap = snapshots?.find(
    s => Math.round(Number(s.roundNum)) === Math.round(roundNum)
  )
  if (!snap?.syncedAt) return null
  const d =
    snap.syncedAt instanceof Date
      ? snap.syncedAt
      : new Date(String(snap.syncedAt))
  return Number.isNaN(d.getTime()) ? null : d
}

export function roundDeadlineFromStart(
  startedAt: Date | null,
  minutes: number
): Date | null {
  if (!startedAt || minutes <= 0) return null
  return new Date(startedAt.getTime() + minutes * 60_000)
}

export function buildOnlineRoundTimerForRound(args: {
  tournamentMode?: string
  state?: string
  onlineRoundTimeMinutes?: unknown
  roundSnapshots?: SnapshotLean[]
  roundNum: number
}): OnlineRoundTimerPayload | null {
  if (!eventSupportsMatchChat(args.tournamentMode)) return null
  if (args.state !== 'running') return null

  const minutes = clampOnlineRoundTimeMinutes(args.onlineRoundTimeMinutes)
  if (minutes <= 0) return null

  const roundNum = Math.max(1, Math.round(Number(args.roundNum) || 0))
  const startedAt = roundSnapshotStartedAt(args.roundSnapshots, roundNum)
  const endsAt = roundDeadlineFromStart(startedAt, minutes)
  if (!startedAt || !endsAt) return null

  return {
    roundNum,
    minutes,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString()
  }
}

export function buildCurrentOnlineRoundTimer(args: {
  tournamentMode?: string
  state?: string
  onlineRoundTimeMinutes?: unknown
  roundSnapshots?: SnapshotLean[]
  roundNum?: unknown
}): OnlineRoundTimerPayload | null {
  const roundNum = Math.max(0, Math.round(Number(args.roundNum) || 0))
  if (roundNum < 1) return null
  return buildOnlineRoundTimerForRound({ ...args, roundNum })
}

export function formatRoundTimerRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
