/** Lunes = primer día (índice 0), domingo = 6. */
export function mondayIndexFromDate(d: Date): number {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

export function startOfWeekMonday(from: Date): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const monIdx = mondayIndexFromDate(d)
  const monday = new Date(d)
  monday.setDate(d.getDate() - monIdx)
  return monday
}

export function endOfWeekSunday(from: Date): Date {
  const mon = startOfWeekMonday(from)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun
}

/** `true` si el instante del evento (ISO) cae en la semana local del lunes `weekAnchor` (lun 00:00 → dom 23:59:59.999). */
export function isEventInLocalWeek(iso: string, weekAnchor: Date): boolean {
  const mon = startOfWeekMonday(weekAnchor)
  const nextMon = new Date(mon)
  nextMon.setDate(mon.getDate() + 7)
  const t = new Date(iso).getTime()
  return t >= mon.getTime() && t < nextMon.getTime()
}

export function addWeeks(weekStartMonday: Date, delta: number): Date {
  const n = new Date(weekStartMonday)
  n.setDate(n.getDate() + delta * 7)
  return n
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Los 7 `YYYY-MM-DD` locales del lunes a domingo a partir del lunes de esa semana (00:00 local). */
export function weekDayKeysFromMonday(weekStartMonday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartMonday)
    d.setDate(weekStartMonday.getDate() + i)
    return localDayKey(d)
  })
}

export { santiagoDayKey } from '@/lib/santiago-day-key'
