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

  return decklistLabelsFromLean(deck, ref)
}

function decklistLabelsFromLean(
  deck: {
    name?: string
    variants?: { _id: mongoose.Types.ObjectId; label: string }[]
  },
  ref: RefLean
): { decklistName: string; listLabel: string } {
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

/**
 * Una sola consulta Mongo para etiquetas de mazos en meta de torneo (en lugar de N× findOne).
 */
export async function batchTournamentDecklistDisplayLabels(
  requests: { userId: string; ref: RefLean }[]
): Promise<Map<string, { decklistName: string; listLabel: string } | null>> {
  const out = new Map<
    string,
    { decklistName: string; listLabel: string } | null
  >()
  const valid = requests.filter(
    r =>
      r.ref?.decklistId &&
      mongoose.Types.ObjectId.isValid(r.userId) &&
      mongoose.Types.ObjectId.isValid(String(r.ref.decklistId))
  )
  if (valid.length === 0) return out

  const deckIds = [
    ...new Set(
      valid.map(r => String(r.ref.decklistId)).filter(id => id.length > 0)
    )
  ].map(id => new mongoose.Types.ObjectId(id))

  const decks = await SavedDecklist.find({ _id: { $in: deckIds } })
    .select('name variants userId')
    .lean<
      {
        _id: mongoose.Types.ObjectId
        userId: mongoose.Types.ObjectId
        name?: string
        variants?: { _id: mongoose.Types.ObjectId; label: string }[]
      }[]
    >()

  const deckByOwnerKey = new Map<string, (typeof decks)[number]>()
  for (const deck of decks) {
    deckByOwnerKey.set(`${String(deck._id)}|${String(deck.userId)}`, deck)
  }

  for (const { userId, ref } of valid) {
    const cacheKey = `${userId}|${String(ref.decklistId)}`
    const deck = deckByOwnerKey.get(`${String(ref.decklistId)}|${userId}`)
    out.set(cacheKey, deck ? decklistLabelsFromLean(deck, ref) : null)
  }

  return out
}
