import type { PublicWeeklyEvent } from '@/hooks/useWeeklyEvents'
import { registrationClosesAt } from '@/lib/weekly-events'
import { WEEKLY_EVENT_PARTICIPANTS_MAX } from '@/lib/parse-pasted-event-flyer'

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function isUnlimitedWeeklyCapacity(maxParticipants: number): boolean {
  return maxParticipants >= WEEKLY_EVENT_PARTICIPANTS_MAX
}

export function gameLabel(g: PublicWeeklyEvent['game']) {
  if (g === 'pokemon') return 'Pokémon'
  if (g === 'magic') return 'Magic'
  return 'Otro TCG'
}

export function kindLabel(k: PublicWeeklyEvent['kind']) {
  if (k === 'tournament') return 'Torneo'
  if (k === 'trade_day') return 'Intercambio'
  return 'Evento'
}

export function pokemonSubtypeLabel(
  s: NonNullable<PublicWeeklyEvent['pokemonSubtype']>
) {
  if (s === 'casual') return 'Casual'
  if (s === 'cup') return 'Cup'
  return 'Challenge'
}

export function formatPrice(ev: PublicWeeklyEvent) {
  if (ev.kind !== 'tournament') return '—'
  if (ev.priceClp <= 0) return 'Gratis'
  return `${ev.priceClp.toLocaleString('es-CL')} CLP`
}

export function formatWhen(iso: string) {
  const d = new Date(iso)
  const dayLong = d.toLocaleDateString('es-CL', { weekday: 'long' })
  const dayCap = dayLong.charAt(0).toUpperCase() + dayLong.slice(1)
  const datePart = d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long'
  })
  const timePart = d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${dayCap} ${datePart} · ${timePart}`
}

export function formatCloseNote(iso: string) {
  const t = registrationClosesAt(new Date(iso))
  return t.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function formatWlt(r: { wins: number; losses: number; ties: number }) {
  return `${r.wins} / ${r.losses} / ${r.ties}`
}
