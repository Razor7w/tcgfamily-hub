import { isValidPokedexSlug } from '@/lib/limitless-pokemon-sprite'

export {
  SAVED_DECKLIST_NAME_MAX,
  SAVED_DECKLIST_TEXT_MAX,
  DECKLIST_VARIANT_LABEL_MAX,
  DECKLIST_VARIANTS_MAX
} from '@/lib/decklist-constants'

export {
  parseNewVariantPayload,
  parsePatchVariantPayload
} from '@/lib/decklist-variant-payload'

/** Exactamente 2 slugs distintos válidos (sprites Limitless). */
export function normalizeTwoPokemonSlugs(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') return null
    const s = x.trim().toLowerCase()
    if (!s) continue
    if (!isValidPokedexSlug(s)) return null
    if (!out.includes(s)) out.push(s)
    if (out.length > 2) return null
  }
  if (out.length !== 2) return null
  return out
}

/** Entre 1 y 2 slugs distintos válidos (decklists guardados). */
export function normalizeOneOrTwoPokemonSlugs(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') return null
    const s = x.trim().toLowerCase()
    if (!s) continue
    if (!isValidPokedexSlug(s)) return null
    if (!out.includes(s)) out.push(s)
    if (out.length > 2) return null
  }
  if (out.length < 1 || out.length > 2) return null
  return out
}
