/** Lunes = primer día (índice 0), domingo = 6. */
export function mondayIndexFromDate(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

export function startOfWeekMonday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const monIdx = mondayIndexFromDate(d);
  const monday = new Date(d);
  monday.setDate(d.getDate() - monIdx);
  return monday;
}

export function endOfWeekSunday(from: Date): Date {
  const mon = startOfWeekMonday(from);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

export function addWeeks(weekStartMonday: Date, delta: number): Date {
  const n = new Date(weekStartMonday);
  n.setDate(n.getDate() + delta * 7);
  return n;
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
