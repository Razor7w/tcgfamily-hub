import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Mail from '@/models/Mails'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import {
  MAIL_REGISTER_DAILY_LIMIT,
  MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX
} from '@/lib/mail-register-constants'
import { rutCompareKey } from '@/lib/mail-recipient-filter'

export { MAIL_REGISTER_DAILY_LIMIT } from '@/lib/mail-register-constants'

/** Lectura ligera del límite (sin crear/guardar documento de configuración). */
async function readMailRegisterDailyLimitFromDb(
  storeMongoId: string
): Promise<number | null> {
  const activeOid = new mongoose.Types.ObjectId(storeMongoId)
  const primary = await memoPrimaryTcgfamilyStoreObjectId()

  const select = { mailRegisterDailyLimit: 1 } as const
  type Row = { mailRegisterDailyLimit?: number } | null

  if (primary?.equals(activeOid)) {
    const scoped = await DashboardModuleSettings.findOne({ storeId: activeOid })
      .select(select)
      .lean<Row>()
    if (scoped?.mailRegisterDailyLimit != null) {
      return scoped.mailRegisterDailyLimit
    }
    const legacy = await DashboardModuleSettings.findOne({
      storeId: { $exists: false }
    })
      .select(select)
      .lean<Row>()
    return legacy?.mailRegisterDailyLimit ?? null
  }

  const doc = await DashboardModuleSettings.findOne({ storeId: activeOid })
    .select(select)
    .lean<Row>()
  return doc?.mailRegisterDailyLimit ?? null
}

/** Límite desde admin: cache en memoria por tienda (configurable en /admin/configuracion). */
const MAIL_LIMIT_CACHE_MS = 60_000
const mailRegisterLimitMemo = new Map<
  string,
  { value: number; until: number }
>()

/**
 * Límite vigente para la tienda activa (mismo documento que `/admin/configuracion`).
 */
export async function getMailRegisterDailyLimitForStore(
  storeMongoId: string
): Promise<number> {
  const now = Date.now()
  const memo = mailRegisterLimitMemo.get(storeMongoId)
  if (memo && now < memo.until) {
    return memo.value
  }

  await connectDB()
  const n = await readMailRegisterDailyLimitFromDb(storeMongoId)
  let value: number
  if (typeof n === 'number' && Number.isFinite(n)) {
    const rounded = Math.round(n)
    value = Math.min(MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX, Math.max(1, rounded))
  } else {
    value = MAIL_REGISTER_DAILY_LIMIT
  }
  mailRegisterLimitMemo.set(storeMongoId, {
    value,
    until: now + MAIL_LIMIT_CACHE_MS
  })
  return value
}

/**
 * Tras actualizar el límite en admin: invalida cache para esa tienda, o todas si omites el id.
 */
export function invalidateMailRegisterDailyLimitCache(
  storeMongoId?: string
): void {
  if (storeMongoId) {
    mailRegisterLimitMemo.delete(storeMongoId)
  } else {
    mailRegisterLimitMemo.clear()
  }
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

/**
 * Registros del día (Chile) del emisor **en la tienda activa** (mismo alcance que el POST de mails).
 */
export async function countMailsRegisteredTodayBySenderForStore(
  fromUserId: string | mongoose.Types.ObjectId,
  activeStoreOid: mongoose.Types.ObjectId,
  primaryStoreOid: mongoose.Types.ObjectId | null
): Promise<number> {
  const { start, endExclusive } = getChileCalendarDayRangeUtc()
  const oid =
    typeof fromUserId === 'string'
      ? new mongoose.Types.ObjectId(fromUserId)
      : fromUserId
  const scope = mongoFilterByStore(activeStoreOid, primaryStoreOid) as Record<
    string,
    unknown
  >
  return Mail.countDocuments({
    ...scope,
    fromUserId: oid,
    createdAt: { $gte: start, $lt: endExclusive }
  })
}

/** Match de `toRut` tolerante a puntos/guiones (mismo RUT). */
function toRutMatchFilter(raw: string): Record<string, unknown> | null {
  const key = rutCompareKey(raw)
  const digits = key.replace(/\D/g, '')
  if (!digits) {
    const t = raw.trim()
    return t ? { toRut: t } : null
  }
  return {
    toRut: {
      $regex: digits.split('').join('[.\\-\\s]?'),
      $options: 'i'
    }
  }
}

export type SenderToRutTodayDuplicate = {
  count: number
  latestCode?: string
  latestCreatedAt?: string
}

/**
 * Correos del emisor al mismo RUT en la tienda, hoy (calendario Chile).
 * Para avisar antes de registrar un posible duplicado.
 */
export async function findSenderMailsToRutTodayForStore(options: {
  fromUserId: string | mongoose.Types.ObjectId
  toRut: string
  activeStoreOid: mongoose.Types.ObjectId
  primaryStoreOid: mongoose.Types.ObjectId | null
}): Promise<SenderToRutTodayDuplicate> {
  const toRutMatch = toRutMatchFilter(options.toRut)
  if (!toRutMatch) {
    return { count: 0 }
  }

  const { start, endExclusive } = getChileCalendarDayRangeUtc()
  const oid =
    typeof options.fromUserId === 'string'
      ? new mongoose.Types.ObjectId(options.fromUserId)
      : options.fromUserId
  const scope = mongoFilterByStore(
    options.activeStoreOid,
    options.primaryStoreOid
  ) as Record<string, unknown>

  const filter = {
    ...scope,
    fromUserId: oid,
    createdAt: { $gte: start, $lt: endExclusive },
    ...toRutMatch
  }

  const [count, latest] = await Promise.all([
    Mail.countDocuments(filter),
    Mail.findOne(filter)
      .sort({ createdAt: -1 })
      .select('code createdAt')
      .lean<{ code?: string; createdAt?: Date } | null>()
  ])

  return {
    count,
    latestCode:
      typeof latest?.code === 'string' && latest.code.trim()
        ? latest.code.trim()
        : undefined,
    latestCreatedAt:
      latest?.createdAt instanceof Date
        ? latest.createdAt.toISOString()
        : undefined
  }
}

/**
 * Cupo diario de registros invitados (mismo RUT emisor, misma tienda, día Chile).
 */
export async function countGuestMailsRegisteredTodayByFromRutForStore(
  fromRut: string,
  activeStoreOid: mongoose.Types.ObjectId,
  primaryStoreOid: mongoose.Types.ObjectId | null
): Promise<number> {
  const toRutMatch = toRutMatchFilter(fromRut)
  if (!toRutMatch) return 0

  const { start, endExclusive } = getChileCalendarDayRangeUtc()
  const scope = mongoFilterByStore(activeStoreOid, primaryStoreOid) as Record<
    string,
    unknown
  >

  // Reutilizar el match de dígitos sobre el campo fromRut
  const fromRutFilter =
    'toRut' in toRutMatch
      ? { fromRut: (toRutMatch as { toRut: unknown }).toRut }
      : null
  if (!fromRutFilter) return 0

  return Mail.countDocuments({
    ...scope,
    isGuest: true,
    ...fromRutFilter,
    createdAt: { $gte: start, $lt: endExclusive }
  })
}
