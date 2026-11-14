/** Destino de retiro: en camino a esa sucursal, o ya ahí si no hay traslado pendiente. */
export const MAIL_DESTINATION_CITIES = [
  { id: 'villa-alemana', label: 'Villa Alemana', match: 'villa alemana' },
  { id: 'vina-del-mar', label: 'Viña del Mar', match: 'vina del mar' }
] as const

export type MailDestinationCity = (typeof MAIL_DESTINATION_CITIES)[number]['id']

export function foldMailPlaceName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function parseMailDestinationCity(
  raw: string | null | undefined
): MailDestinationCity | undefined {
  const value = raw?.trim()
  if (value === 'villa-alemana' || value === 'vina-del-mar') return value
  return undefined
}

export function mailDestinationCityFromName(
  name: string
): MailDestinationCity | null {
  const folded = foldMailPlaceName(name)
  if (!folded) return null
  for (const city of MAIL_DESTINATION_CITIES) {
    if (folded.includes(city.match)) return city.id
  }
  return null
}
