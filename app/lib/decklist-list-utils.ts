/** Filtro por última actualización (`updatedAt`), zona horaria local. */
export type DecklistDateFilter = 'all' | 'week' | 'month'

function startOfIsoWeekLocal(ref: Date): Date {
  const d = new Date(ref)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonthLocal(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0)
}

export function matchesDecklistDateFilter(
  updatedAtIso: string,
  filter: DecklistDateFilter
): boolean {
  if (filter === 'all') return true
  const t = new Date(updatedAtIso).getTime()
  if (Number.isNaN(t)) return false
  const now = new Date()
  const start =
    filter === 'week' ? startOfIsoWeekLocal(now) : startOfMonthLocal(now)
  return t >= start.getTime()
}
