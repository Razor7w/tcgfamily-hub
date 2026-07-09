/** Comparación laxa con el display name del leaderboard Play! Pokémon. */
export function normalizePlayPokemonDisplayName(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function playPokemonDisplayNamesMatch(a: string, b: string): boolean {
  const left = normalizePlayPokemonDisplayName(a)
  const right = normalizePlayPokemonDisplayName(b)
  if (!left || !right) return false
  return left === right
}
