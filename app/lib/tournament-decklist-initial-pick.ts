import type { SavedDecklistTournamentOption } from '@/components/decklist/SavedDecklistVariantPicker'
import type {
  MyTournamentDecklistDisplayDTO,
  MyTournamentDecklistRefDTO
} from '@/hooks/useWeeklyEvents'

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
