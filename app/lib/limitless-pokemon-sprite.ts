/** CDN público Limitless (Pokémon TCG Live / recursos de la comunidad). */
export const LIMITLESS_POKEMON_SPRITE_BASE =
  "https://r2.limitlesstcg.net/pokemon/gen9";

/**
 * URL del sprite; `slug` suele coincidir con el nombre en PokéAPI (minúsculas, guiones).
 */
export function getLimitlessPokemonSpriteUrl(slug: string): string {
  const s = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  return `${LIMITLESS_POKEMON_SPRITE_BASE}/${s}.png`;
}

/** Valida slug seguro para guardar en BD. */
export function isValidPokedexSlug(s: string): boolean {
  return /^[a-z][a-z0-9-]{0,62}$/.test(s.trim().toLowerCase());
}
