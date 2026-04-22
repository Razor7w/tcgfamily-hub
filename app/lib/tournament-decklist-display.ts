import mongoose from 'mongoose'
import SavedDecklist from '@/models/SavedDecklist'

type RefLean = {
  decklistId?: unknown
  listKind?: string
  variantId?: unknown
}

/**
 * Nombre del mazo + etiqueta del listado (base o variante) para UI del torneo.
 */
export async function getTournamentDecklistDisplayLabels(
  ownerUserId: mongoose.Types.ObjectId,
  ref: RefLean | null | undefined
): Promise<{ decklistName: string; listLabel: string } | null> {
  if (!ref?.decklistId) return null

  const deck = await SavedDecklist.findOne({
    _id: ref.decklistId,
    userId: ownerUserId
  })
    .select('name variants')
    .lean<{
      name?: string
      variants?: { _id: mongoose.Types.ObjectId; label: string }[]
    } | null>()

  if (!deck) return null

  const decklistName =
    typeof deck.name === 'string' && deck.name.trim()
      ? deck.name.trim()
      : 'Mazo'
  const listKind = ref.listKind === 'variant' ? 'variant' : 'base'

  if (listKind === 'base') {
    return { decklistName, listLabel: 'Listado base' }
  }

  const vid = ref.variantId != null ? String(ref.variantId) : ''
  const v = Array.isArray(deck.variants)
    ? deck.variants.find(x => String(x._id) === vid)
    : undefined
  const listLabel =
    v && typeof v.label === 'string' && v.label.trim()
      ? v.label.trim()
      : 'Variante'

  return { decklistName, listLabel }
}
