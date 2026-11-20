import { randomBytes } from 'crypto'
import type { Types } from 'mongoose'
import connectDB from '@/lib/mongodb'
import PreconTimer, { type IPreconTimer } from '@/models/PreconTimer'
import {
  readPreconTimerMinutes,
  type PreconTimerSnapshot
} from '@/lib/precon-timer'

const TOKEN_PATTERN = /^[a-f0-9]{32}$/

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  )
}

function readRound(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null
  return parsed
}

export function preconTimerSnapshot(
  doc: IPreconTimer,
  now = Date.now()
): PreconTimerSnapshot {
  const endsAt = doc.endsAt ? doc.endsAt.getTime() : null
  const startedAt =
    doc.startedAt?.getTime() ??
    (doc.status === 'running' && endsAt !== null ? now : null)
  const running =
    doc.status === 'running' && startedAt !== null && endsAt !== null
  return {
    token: doc.token,
    minutes: doc.durationMinutes,
    status: doc.status,
    startedAt: running ? startedAt : null,
    endsAt: running ? endsAt : null,
    remainingMs: running
      ? Math.max(0, endsAt - now)
      : Math.max(0, doc.remainingMs),
    round: doc.roundNumber ?? null,
    serverNow: now
  }
}

export async function findOrCreatePreconTimer(
  storeId: Types.ObjectId
): Promise<IPreconTimer> {
  await connectDB()
  const existing = await PreconTimer.findOne({ storeId })
  if (existing) return existing
  try {
    return await PreconTimer.create({
      storeId,
      token: randomBytes(16).toString('hex'),
      durationMinutes: 50,
      status: 'idle',
      startedAt: null,
      endsAt: null,
      remainingMs: 50 * 60_000,
      roundNumber: null
    })
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const again = await PreconTimer.findOne({ storeId })
    if (again) return again
    throw error
  }
}

export async function findPreconTimerByToken(
  token: string
): Promise<IPreconTimer | null> {
  if (!TOKEN_PATTERN.test(token)) return null
  await connectDB()
  return PreconTimer.findOne({ token })
}

export async function applyPreconTimerAction(
  doc: IPreconTimer,
  action: unknown,
  body: { minutes?: unknown; round?: unknown }
): Promise<string | null> {
  const now = Date.now()
  if (action === 'start') {
    const minutes = readPreconTimerMinutes(body.minutes)
    if (minutes === null) {
      return 'El tiempo va de 1 a 240 minutos.'
    }
    doc.durationMinutes = minutes
    doc.remainingMs = minutes * 60_000
    doc.startedAt = new Date(now)
    doc.endsAt = new Date(now + doc.remainingMs)
    doc.status = 'running'
    doc.roundNumber = readRound(body.round)
    await doc.save()
    return null
  }
  if (action === 'pause') {
    if (doc.status !== 'running' || !doc.endsAt) return null
    doc.remainingMs = Math.max(0, doc.endsAt.getTime() - now)
    doc.startedAt = null
    doc.endsAt = null
    doc.status = doc.remainingMs === 0 ? 'idle' : 'paused'
    await doc.save()
    return null
  }
  if (action === 'resume') {
    if (doc.status !== 'paused' || doc.remainingMs <= 0) return null
    doc.startedAt = new Date(now)
    doc.endsAt = new Date(now + doc.remainingMs)
    doc.status = 'running'
    await doc.save()
    return null
  }
  if (action === 'reset') {
    doc.status = 'idle'
    doc.startedAt = null
    doc.endsAt = null
    doc.remainingMs = doc.durationMinutes * 60_000
    doc.roundNumber = null
    await doc.save()
    return null
  }
  return 'Acción no reconocida.'
}
