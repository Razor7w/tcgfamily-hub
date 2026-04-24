import { isValidPokedexSlug } from '@/lib/limitless-pokemon-sprite'

const MAX_DECK_POKEMON = 2

/**
 * Normaliza la lista de slugs del deck del participante (torneo): 0–2 Pokémon válidos.
 * Array vacío = sin Pokémon (deck vacío).
 */
export function normalizeParticipantDeckPokemonSlugs(
  raw: unknown
): string[] | null {
  if (!Array.isArray(raw)) return null
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') return null
    const s = x.trim().toLowerCase()
    if (!s) continue
    if (!isValidPokedexSlug(s)) return null
    if (!out.includes(s)) out.push(s)
    if (out.length > MAX_DECK_POKEMON) return null
  }
  return out
}
