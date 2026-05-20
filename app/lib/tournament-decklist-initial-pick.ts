import type { SavedDecklistTournamentOption } from '@/components/decklist/SavedDecklistVariantPicker'
import type {
  MyTournamentDecklistDisplayDTO,
  MyTournamentDecklistRefDTO
} from '@/hooks/useWeeklyEvents'

export function decklistOptionKeyFromRef(
  ref: MyTournamentDecklistRefDTO
): string {
  return ref.listKind === 'variant' && ref.variantId
    ? `${ref.decklistId}:v:${ref.variantId}`
    : `${ref.decklistId}:base`
}

/** Resuelve la opción del picker a partir de la referencia guardada en el torneo. */
export function findDecklistPickByRef(
  options: SavedDecklistTournamentOption[],
  ref: MyTournamentDecklistRefDTO | null | undefined
): SavedDecklistTournamentOption | null {
  if (!ref) return null
  const key = decklistOptionKeyFromRef(ref)
  return options.find(o => o.key === key) ?? null
}

/**
 * Construye la opción del Autocomplete a partir de los datos del torneo (perfil / API).
 */
export function initialDecklistPickFromTournament(
  ref: MyTournamentDecklistRefDTO | null | undefined,
  display: MyTournamentDecklistDisplayDTO | null | undefined,
  pokemonSlugs: string[]
): SavedDecklistTournamentOption | null {
  if (!ref || !display) return null
  const key =
    ref.listKind === 'variant' && ref.variantId
      ? `${ref.decklistId}:v:${ref.variantId}`
      : `${ref.decklistId}:base`
  return {
    key,
    decklistId: ref.decklistId,
    decklistName: display.decklistName,
    listKind: ref.listKind,
    variantId: ref.variantId,
    sublabel: display.listLabel,
    pokemonSlugs: [...pokemonSlugs]
  }
}
