/** CDN público Limitless (Pokémon TCG Live / recursos de la comunidad). */
export const LIMITLESS_POKEMON_SPRITE_BASE =
  'https://r2.limitlesstcg.net/pokemon/gen9'

/**
 * Caja de referencia alineada con listados Limitless (~36×30 CSS px; sprites pixel-art horizontales).
 */
export const LIMITLESS_SPRITE_BOX = {
  width: 36,
  height: 30
} as const

/**
 * Mantiene la misma relación de aspecto que Limitless para cualquier ancho en px.
 */
export function limitlessSpriteDimensions(widthPx: number): {
  width: number
  height: number
} {
  const w = Math.max(1, widthPx)
  const h = Math.round(
    (w * LIMITLESS_SPRITE_BOX.height) / LIMITLESS_SPRITE_BOX.width
  )
  return { width: w, height: Math.max(1, h) }
}

/**
 * URL del sprite; `slug` suele coincidir con el nombre en PokéAPI (minúsculas, guiones).
 */
export function getLimitlessPokemonSpriteUrl(slug: string): string {
  const s = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  return `${LIMITLESS_POKEMON_SPRITE_BASE}/${s}.png`
}

/** Valida slug seguro para guardar en BD. */
export function isValidPokedexSlug(s: string): boolean {
  return /^[a-z][a-z0-9-]{0,62}$/.test(s.trim().toLowerCase())
}
