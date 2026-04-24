/** Tipos y armado de queries para la API pública de Deck Builder de Limitless TCG. */

export const LIMITLESS_DM_SUFFIX = 'lang:en,en.t is:unreleased,.i' as const

export type LimitlessDmFormat = 'standard' | 'expanded' | 'glc'

/** Valores del filtro `type:` en la query de búsqueda (subset alineado con la UI de Limitless). */
export type LimitlessDmTypeFilter =
  | 'all'
  | 'pokemon'
  | 'trainer'
  | 'energy'
  | 'item'
  | 'supporter'
  | 'stadium'
  | 'tool'
  | 'basic_energy'
  | 'special_energy'

export type LimitlessDmSearchHit = {
  id: number
  card_type: string
  region: string
  set: string
  number: string
  name: string
  translation: number
  special: string | null
}

export type LimitlessDmCardDetail = {
  data_id: number
  region: string
  set: string
  number: string
  market_price?: number
  name: string
  card_type: string
  type?: string
  hp?: number
  rarity?: string
  language?: string
  ability_name?: string | null
  ability_effect?: string | null
  a1_name?: string | null
  a1_cost?: string | null
  a1_dmg?: string | null
  a1_effect?: string | null
  a2_name?: string | null
  a2_cost?: string | null
  a2_dmg?: string | null
  a2_effect?: string | null
  a3_name?: string | null
  a3_cost?: string | null
  a3_dmg?: string | null
  a3_effect?: string | null
  a4_name?: string | null
  a4_cost?: string | null
  a4_dmg?: string | null
  a4_effect?: string | null
  effect?: string | null
  illustrator?: string
  [key: string]: unknown
}

/**
 * Búsqueda en Limitless: con `format:standard` (u otros formatos) y/o `type:…` se
 * une el texto y tokens con un espacio; sin formato ni tipo, dos espacios entre el
 * texto y `lang:` + sufijo (misma búsqueda mínima que en la web).
 */
export function buildLimitlessSearchQueryParts(args: {
  text: string
  format?: LimitlessDmFormat | null
  typeFilter?: LimitlessDmTypeFilter | null
}): string {
  const t = args.text.trim()
  if (t.length < 1) {
    return LIMITLESS_DM_SUFFIX
  }

  const withFormat = Boolean(
    args.format === 'standard' ||
    args.format === 'expanded' ||
    args.format === 'glc'
  )
  const tf = args.typeFilter ?? 'all'
  const typeToken = tf !== 'all' ? limitlessTypeFilterToQuery(tf) : null
  const withType = Boolean(typeToken)

  if (!withFormat && !withType) {
    return `${t}  ${LIMITLESS_DM_SUFFIX}`
  }

  const mid: string[] = []
  if (withFormat) mid.push(`format:${args.format}`)
  if (withType && typeToken) mid.push(`type:${typeToken}`)
  return [t, ...mid, LIMITLESS_DM_SUFFIX].join(' ')
}

function limitlessTypeFilterToQuery(tf: LimitlessDmTypeFilter): string | null {
  switch (tf) {
    case 'all':
      return null
    case 'basic_energy':
      return 'basic energy'
    case 'special_energy':
      return 'special energy'
    default:
      return tf
  }
}

export function deckSectionFromCardType(
  cardType: string
): 'pokemon' | 'trainer' | 'energy' {
  const c = cardType.toLowerCase()
  if (c === 'pokemon') return 'pokemon'
  if (c === 'energy' || c.includes('energy')) return 'energy'
  return 'trainer'
}

/** Nombres de energía básica: sin tope 4 (solo mazo 60) en el armador. */
const BASIC_ENERGY_UNLIMITED_NAMES = new Set(
  [
    'Water Energy',
    'Fighting Energy',
    'Grass Energy',
    'Fire Energy',
    'Lightning Energy',
    'Psychic Energy',
    'Darkness Energy',
    'Metal Energy'
  ].map(n => n.trim().toLowerCase().replace(/\s+/g, ' '))
)

/**
 * @param cardName Nombre de la carta (!= tipo). Coincidencia insensible
 *   a mayúsculas y espacios.
 */
export function isEnergyCardExemptFromFourCopyLimit(cardName: string): boolean {
  const n = cardName.trim().toLowerCase().replace(/\s+/g, ' ')
  return BASIC_ENERGY_UNLIMITED_NAMES.has(n)
}

export type DeckBuilderLine = {
  key: string
  count: number
  name: string
  set: string
  number: string
  cardType: string
}

export function buildDecklistExportText(lines: DeckBuilderLine[]): string {
  const buckets: Record<'pokemon' | 'trainer' | 'energy', DeckBuilderLine[]> = {
    pokemon: [],
    trainer: [],
    energy: []
  }
  for (const line of lines) {
    buckets[deckSectionFromCardType(line.cardType)].push(line)
  }

  const sectionLabel = (id: 'pokemon' | 'trainer' | 'energy') =>
    id === 'pokemon' ? 'Pokémon' : id === 'trainer' ? 'Trainer' : 'Energy'

  const out: string[] = []
  for (const id of ['pokemon', 'trainer', 'energy'] as const) {
    const cards = buckets[id]
    if (cards.length === 0) continue
    const sum = cards.reduce((s, x) => s + x.count, 0)
    out.push(`${sectionLabel(id)}: ${sum}`)
    for (const c of cards) {
      out.push(`${c.count} ${c.name} ${c.set} ${c.number}`)
    }
    out.push('')
  }
  return out.join('\n').trimEnd()
}
