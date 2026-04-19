import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'
import {
  MAIL_REGISTER_DAILY_LIMIT,
  MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX
} from '@/lib/mail-register-constants'

export { MAIL_REGISTER_DAILY_LIMIT } from '@/lib/mail-register-constants'

/**
 * Límite vigente (configurable en /admin/configuracion). Requiere BD conectada.
 */
export async function getMailRegisterDailyLimit(): Promise<number> {
  await connectDB()
  const doc = await DashboardModuleSettings.findOne()
    .select('mailRegisterDailyLimit')
    .lean<{ mailRegisterDailyLimit?: number } | null>()
  const n = doc?.mailRegisterDailyLimit
  if (typeof n === 'number' && Number.isFinite(n)) {
    const rounded = Math.round(n)
    return Math.min(MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX, Math.max(1, rounded))
  }
  return MAIL_REGISTER_DAILY_LIMIT
}

const CHILE_TZ = 'America/Santiago'

/**
 * Rango [start, endExclusive) para el día calendario actual en America/Santiago.
 * Sirve para contar registros del usuario de forma coherente con el negocio en Chile.
 */
export function getChileCalendarDayRangeUtc(reference = new Date()): {
  start: Date
  endExclusive: Date
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(reference)
  const y = Number(parts.find(p => p.type === 'year')!.value)
  const mo = Number(parts.find(p => p.type === 'month')!.value)
  const day = Number(parts.find(p => p.type === 'day')!.value)

  const start = findEarliestInstantInChileCalendarDay(y, mo, day)
  const endExclusive = findFirstInstantOutsideChileCalendarDay(
    start,
    y,
    mo,
    day
  )
  return { start, endExclusive }
}

function findEarliestInstantInChileCalendarDay(
  y: number,
  mo: number,
  day: number
): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const center = Date.UTC(y, mo - 1, day, 8, 0, 0)
  let first: Date | null = null
  const windowMs = 52 * 3600 * 1000
  for (let ms = center - windowMs; ms <= center + windowMs; ms += 1000) {
    const t = new Date(ms)
    const p = dtf.formatToParts(t)
    const yy = Number(p.find(x => x.type === 'year')!.value)
    const mm = Number(p.find(x => x.type === 'month')!.value)
    const dd = Number(p.find(x => x.type === 'day')!.value)
    if (yy === y && mm === mo && dd === day) {
      if (!first || t < first) first = t
    }
  }
  if (!first) {
    throw new Error(
      `Could not resolve start of Chile calendar day ${y}-${mo}-${day}`
    )
  }
  return first
}

function findFirstInstantOutsideChileCalendarDay(
  start: Date,
  y: number,
  mo: number,
  day: number
): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const windowMs = 52 * 3600 * 1000
  for (
    let ms = start.getTime() + 1000;
    ms <= start.getTime() + windowMs;
    ms += 1000
  ) {
    const t = new Date(ms)
    const p = dtf.formatToParts(t)
    const yy = Number(p.find(x => x.type === 'year')!.value)
    const mm = Number(p.find(x => x.type === 'month')!.value)
    const dd = Number(p.find(x => x.type === 'day')!.value)
    if (yy !== y || mm !== mo || dd !== day) {
      return t
    }
  }
  throw new Error('Could not resolve end of Chile calendar day')
}

export async function countMailsRegisteredTodayBySender(
  fromUserId: string | mongoose.Types.ObjectId
): Promise<number> {
  const { start, endExclusive } = getChileCalendarDayRangeUtc()
  const oid =
    typeof fromUserId === 'string'
      ? new mongoose.Types.ObjectId(fromUserId)
      : fromUserId
  return Mail.countDocuments({
    fromUserId: oid,
    createdAt: { $gte: start, $lt: endExclusive }
  })
}
