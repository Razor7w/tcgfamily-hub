import 'server-only'

const CHILE_TZ = 'America/Santiago'

const chileDayPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

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

export type ChileCalendarMonthRange = {
  start: Date
  endExclusive: Date
  monthKey: string
  monthLabel: string
}

let monthRangeMemo: { key: string; range: ChileCalendarMonthRange } | null =
  null

/** Rango [start, endExclusive) del mes calendario actual en America/Santiago. */
export function getChileCalendarMonthRangeUtc(
  reference = new Date()
): ChileCalendarMonthRange {
  const { y, mo } = chileCalendarParts(reference.getTime())
  const monthKey = `${y}-${String(mo).padStart(2, '0')}`

  if (monthRangeMemo?.key === monthKey) {
    return monthRangeMemo.range
  }

  const start = startOfChileCalendarDay(y, mo, 1)
  const nextMo = mo === 12 ? 1 : mo + 1
  const nextY = mo === 12 ? y + 1 : y
  const endExclusive = startOfChileCalendarDay(nextY, nextMo, 1)

  const monthLabelRaw = new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    month: 'long',
    year: 'numeric'
  }).format(start)
  const monthLabel =
    monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1)

  const range: ChileCalendarMonthRange = {
    start,
    endExclusive,
    monthKey,
    monthLabel
  }
  monthRangeMemo = { key: monthKey, range }
  return range
}
