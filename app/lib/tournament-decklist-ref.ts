import mongoose from 'mongoose'

export type TournamentDecklistRefPayload = {
  decklistId: string
  listKind: 'base' | 'variant'
  variantId: string | null
}

/**
 * Parsea el cuerpo opcional `tournamentDecklistRef` (PUT deck, POST torneo custom).
 * `undefined` = no tocar el campo; `null` = borrar referencia.
 */
export function parseTournamentDecklistRefBody(
  body: Record<string, unknown>
): TournamentDecklistRefPayload | null | undefined {
  if (!('tournamentDecklistRef' in body)) return undefined
  const raw = body.tournamentDecklistRef
  if (raw === null) return null
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const decklistId = typeof o.decklistId === 'string' ? o.decklistId.trim() : ''
  const listKind = o.listKind === 'variant' ? 'variant' : 'base'
  let variantId: string | null = null
  if (listKind === 'variant') {
    if (typeof o.variantId === 'string' && o.variantId.trim()) {
      variantId = o.variantId.trim()
    } else {
      return undefined
    }
  }
  if (!decklistId) return undefined
  try {
    new mongoose.Types.ObjectId(decklistId)
    if (variantId) new mongoose.Types.ObjectId(variantId)
  } catch {
    return undefined
  }
  return { decklistId, listKind, variantId }
}
