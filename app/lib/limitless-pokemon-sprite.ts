/** CDN público Limitless (Pokémon TCG Live / recursos de la comunidad). */
export const LIMITLESS_POKEMON_SPRITE_BASE =
  'https://r2.limitlesstcg.net/pokemon/gen9'

/** Sprites locales (ítems / entrenador) con el mismo uso que slugs Pokédex. */
export const CUSTOM_LIMITLESS_SPRITES = {
  'crushing-hammer': '/sprites/items/crushing-hammer.png'
} as const

export type CustomLimitlessSpriteSlug = keyof typeof CUSTOM_LIMITLESS_SPRITES

export const CUSTOM_LIMITLESS_SPRITE_OPTIONS: {
  slug: CustomLimitlessSpriteSlug
  label: string
}[] = [{ slug: 'crushing-hammer', label: 'Crushing Hammer' }]

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
 * Limitless gen9 no usa el sufijo `-mask` de PokéAPI (p. ej. `ogerpon-wellspring`, no
 * `ogerpon-wellspring-mask`).
 */
export function limitlessSpriteSlugFromPokedexSlug(slug: string): string {
  let s = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  if (s.endsWith('-mask')) {
    s = s.slice(0, -'-mask'.length)
  }
  return s
}

/**
 * URL del sprite; `slug` suele coincidir con el nombre en PokéAPI (minúsculas, guiones).
 */
export function isCustomLimitlessSpriteSlug(
  slug: string
): slug is CustomLimitlessSpriteSlug {
  return slug in CUSTOM_LIMITLESS_SPRITES
}

/** Sprites pixel-art (Pokédex Limitless e ítems locales). */
export function limitlessSpriteImageRendering(
  slug: string
): 'pixelated' | 'auto' {
  void slug
  return 'pixelated'
}

export function getLimitlessPokemonSpriteUrl(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  if (isCustomLimitlessSpriteSlug(normalized)) {
    return CUSTOM_LIMITLESS_SPRITES[normalized]
  }
  const s = limitlessSpriteSlugFromPokedexSlug(normalized)
  return `${LIMITLESS_POKEMON_SPRITE_BASE}/${s}.png`
}

/** Valida slug seguro para guardar en BD (Pokédex o sprite custom). */
export function isValidPokedexSlug(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (isCustomLimitlessSpriteSlug(t)) return true
  return /^[a-z][a-z0-9-]{0,62}$/.test(t)
}
