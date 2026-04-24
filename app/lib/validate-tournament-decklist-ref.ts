import mongoose from 'mongoose'
import SavedDecklist from '@/models/SavedDecklist'
import type { TournamentDecklistRefPayload } from '@/lib/tournament-decklist-ref'

export type ValidatedTournamentDecklistRef = {
  decklistId: mongoose.Types.ObjectId
  listKind: 'base' | 'variant'
  variantId: mongoose.Types.ObjectId | null
}

function slugSetsEqual(a: string[], b: string[]): boolean {
  const sa = [...a].filter(Boolean).sort().join('\0')
  const sb = [...b].filter(Boolean).sort().join('\0')
  return sa === sb
}

/**
 * Comprueba que el decklist pertenece al usuario y que los sprites coinciden
 * con `deckPokemonSlugs`; si es variante, que exista.
 */
export async function validateTournamentDecklistRefForUser(
  userId: mongoose.Types.ObjectId,
  ref: TournamentDecklistRefPayload,
  deckPokemonSlugs: string[]
): Promise<
  | { ok: true; value: ValidatedTournamentDecklistRef }
  | { ok: false; reason: 'not_found' | 'slug_mismatch' | 'variant_not_found' }
> {
  type DeckLean = {
    pokemonSlugs?: string[]
    variants?: { _id: mongoose.Types.ObjectId }[]
  } | null

  const deck = (await SavedDecklist.findOne({
    _id: new mongoose.Types.ObjectId(ref.decklistId),
    userId
  })
    .select('pokemonSlugs variants')
    .lean()) as DeckLean

  if (!deck) {
    return { ok: false, reason: 'not_found' }
  }

  const slugs = Array.isArray(deck.pokemonSlugs) ? deck.pokemonSlugs : []
  if (!slugSetsEqual(deckPokemonSlugs, slugs)) {
    return { ok: false, reason: 'slug_mismatch' }
  }

  if (ref.listKind === 'base') {
    return {
      ok: true,
      value: {
        decklistId: new mongoose.Types.ObjectId(ref.decklistId),
        listKind: 'base',
        variantId: null
      }
    }
  }

  const vid = ref.variantId
  if (!vid) {
    return { ok: false, reason: 'variant_not_found' }
  }

  const variants = Array.isArray(deck.variants) ? deck.variants : []
  const v = variants.find(
    (x: { _id: mongoose.Types.ObjectId }) => String(x._id) === vid
  )
  if (!v) {
    return { ok: false, reason: 'variant_not_found' }
  }

  return {
    ok: true,
    value: {
      decklistId: new mongoose.Types.ObjectId(ref.decklistId),
      listKind: 'variant',
      variantId: new mongoose.Types.ObjectId(vid)
    }
  }
}
