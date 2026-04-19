/** Día calendario YYYY-MM-DD en America/Santiago (Chile) para un instante UTC. */
export function santiagoDayKey(isoOrDate: Date | string): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}
