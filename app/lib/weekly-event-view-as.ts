type LeanParticipant = {
  userId?: unknown
  displayName?: string
  confirmed?: boolean
  popId?: string
  wins?: unknown
  losses?: unknown
  ties?: unknown
  deckPokemonSlugs?: string[]
  matchRounds?: unknown
  manualPlacement?: {
    categoryIndex?: number
    place?: number | null
    isDnf?: boolean
  }
  tournamentDecklistRef?: {
    decklistId?: unknown
    listKind?: string
    variantId?: unknown
  }
}

type LeanEventMinimal = {
  tournamentOrigin?: string
  createdByUserId?: unknown
  participants?: LeanParticipant[]
}

function isOwnCustomTournament(
  doc: LeanEventMinimal,
  sessionUserId: string
): boolean {
  const createdByStr =
    doc.createdByUserId != null ? String(doc.createdByUserId) : ''
  if (createdByStr && createdByStr === sessionUserId) return true
  const parts = doc.participants ?? []
  return parts.some(p => p.userId && String(p.userId) === sessionUserId)
}

/** Admin revisando torneo custom ajeno (no el suyo). */
export function isAdminReadOnlyCustomTournamentView(
  doc: LeanEventMinimal,
  sessionUserId: string,
  isAdmin: boolean
): boolean {
  if (!isAdmin || doc.tournamentOrigin !== 'custom') return false
  return !isOwnCustomTournament(doc, sessionUserId)
}

/**
 * Misma lógica que `GET /api/events/[id]`: qué fila de participante representa
 * «mis datos» (jugador o admin viendo torneo custom como el creador).
 */
export function resolveViewAsParticipant(
  doc: LeanEventMinimal,
  sessionUserId: string,
  isAdmin: boolean
): LeanParticipant | undefined {
  const parts = doc.participants ?? []
  const mine = parts.find(p => p.userId && String(p.userId) === sessionUserId)
  const createdByStr =
    doc.createdByUserId != null ? String(doc.createdByUserId) : ''
  let creatorParticipant = createdByStr
    ? parts.find(p => p.userId && String(p.userId) === createdByStr)
    : undefined
  if (!creatorParticipant) {
    creatorParticipant = parts.find(p => p.userId)
  }
  const adminReadOnlyView = isAdminReadOnlyCustomTournamentView(
    doc,
    sessionUserId,
    isAdmin
  )
  const viewAs =
    adminReadOnlyView && creatorParticipant ? creatorParticipant : mine
  return viewAs
}

export function serializeTournamentDecklistRef(
  ref: LeanParticipant['tournamentDecklistRef']
): {
  decklistId: string
  listKind: 'base' | 'variant'
  variantId: string | null
} | null {
  if (!ref?.decklistId) return null
  const decklistId = String(ref.decklistId)
  const listKind = ref.listKind === 'variant' ? 'variant' : 'base'
  const variantId =
    ref.variantId != null && String(ref.variantId).trim()
      ? String(ref.variantId)
      : null
  return { decklistId, listKind, variantId }
}
