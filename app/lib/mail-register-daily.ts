import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'
import {
  MAIL_REGISTER_DAILY_LIMIT,
  MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX
} from '@/lib/mail-register-constants'

export { MAIL_REGISTER_DAILY_LIMIT } from '@/lib/mail-register-constants'

/** Límite desde admin: cache en memoria para no leer `DashboardModuleSettings` en cada request. */
const MAIL_LIMIT_CACHE_MS = 60_000
let mailRegisterLimitMemo: { value: number; until: number } | null = null

/**
 * Límite vigente (configurable en /admin/configuracion). Requiere BD conectada.
 */
export async function getMailRegisterDailyLimit(): Promise<number> {
  const now = Date.now()
  if (mailRegisterLimitMemo && now < mailRegisterLimitMemo.until) {
    return mailRegisterLimitMemo.value
  }

  await connectDB()
  const doc = await DashboardModuleSettings.findOne()
    .select('mailRegisterDailyLimit')
    .lean<{ mailRegisterDailyLimit?: number } | null>()
  const n = doc?.mailRegisterDailyLimit
  let value: number
  if (typeof n === 'number' && Number.isFinite(n)) {
    const rounded = Math.round(n)
    value = Math.min(MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX, Math.max(1, rounded))
  } else {
    value = MAIL_REGISTER_DAILY_LIMIT
  }
  mailRegisterLimitMemo = { value, until: now + MAIL_LIMIT_CACHE_MS }
  return value
}

/** Llamar tras actualizar el límite en admin para no servir un valor cacheado. */
export function invalidateMailRegisterDailyLimitCache(): void {
  mailRegisterLimitMemo = null
}

const CHILE_TZ = 'America/Santiago'

const chileDayPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

/** `format` → `YYYY-MM-DD` (en-CA); más barato que `formatToParts` + búsquedas en el array. */
function chileCalendarParts(utcMs: number): {
  y: number
  mo: number
  day: number
} {
  const s = chileDayPartsFormatter.format(new Date(utcMs))
  const [y, mo, day] = s.split('-').map(Number)
  return { y, mo, day }
}

function compareCal(
  a: { y: number; mo: number; day: number },
  b: { y: number; mo: number; day: number }
): number {
  if (a.y !== b.y) return a.y - b.y
  if (a.mo !== b.mo) return a.mo - b.mo
  return a.day - b.day
}

/**
 * Primer instante UTC en el que el calendario (día civil) en Chile es (y, mo, day).
 * Ventana inicial ±36 h basta para cualquier offset/DST de Chile respecto a UTC.
 */
function startOfChileCalendarDay(y: number, mo: number, day: number): Date {
  const target = { y, mo, day }
  let lo = Date.UTC(y, mo - 1, day) - 36 * 3600 * 1000
  let hi = Date.UTC(y, mo - 1, day) + 36 * 3600 * 1000
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (compareCal(chileCalendarParts(mid), target) < 0) lo = mid + 1
    else hi = mid
  }
  if (compareCal(chileCalendarParts(lo), target) !== 0) {
    throw new Error(
      `Could not resolve start of Chile calendar day ${y}-${mo}-${day}`
    )
  }
  return new Date(lo)
}

/** Primer instante UTC estrictamente después de `dayStart` que ya no es el día civil (y, mo, day). */
function endExclusiveForChileDay(
  dayStart: Date,
  y: number,
  mo: number,
  day: number
): Date {
  let lo = dayStart.getTime() + 1
  let hi = dayStart.getTime() + 52 * 3600 * 1000
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const p = chileCalendarParts(mid)
    const still = p.y === y && p.mo === mo && p.day === day
    if (still) lo = mid + 1
    else hi = mid
  }
  return new Date(lo)
}

/** Mismo día civil chileno → mismo rango UTC (válido hasta el cambio de día en Chile). */
let chileDayRangeMemo: {
  key: string
  range: { start: Date; endExclusive: Date }
} | null = null

/**
 * Rango [start, endExclusive) para el día calendario actual en America/Santiago.
 * Sirve para contar registros del usuario de forma coherente con el negocio en Chile.
 */
export function getChileCalendarDayRangeUtc(reference = new Date()): {
  start: Date
  endExclusive: Date
} {
  const { y, mo, day } = chileCalendarParts(reference.getTime())
  const key = `${y}-${mo}-${day}`
  if (chileDayRangeMemo?.key === key) {
    return chileDayRangeMemo.range
  }

  const start = startOfChileCalendarDay(y, mo, day)
  const endExclusive = endExclusiveForChileDay(start, y, mo, day)
  const range = { start, endExclusive }
  chileDayRangeMemo = { key, range }
  return range
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
