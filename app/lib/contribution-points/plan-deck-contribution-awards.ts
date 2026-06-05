import type { ContributionPointAction } from '@/lib/contribution-points/types'
import { isOfficialTournamentForContribution } from '@/lib/contribution-points/tournament-origin'

export type DeckContributionAwardPlan = {
  action: Extract<ContributionPointAction, 'own_deck_reported' | 'decklist_ref'>
}

function decklistRefKey(ref: {
  decklistId?: unknown
  listKind?: unknown
  variantId?: unknown
}): string | null {
  if (!ref.decklistId) return null
  const kind = ref.listKind === 'variant' ? 'variant' : 'base'
  const variant =
    ref.variantId != null && String(ref.variantId).trim()
      ? String(ref.variantId)
      : ''
  return `${String(ref.decklistId)}:${kind}:${variant}`
}

/** Plan de puntos al persistir mazo en torneo. Solo torneos oficiales. */
export function planDeckContributionAwards(input: {
  tournamentOrigin: 'official' | 'custom'
  previousSlugs: string[]
  nextSlugs: string[]
  previousDecklistRef?: {
    decklistId?: unknown
    listKind?: unknown
    variantId?: unknown
  } | null
  nextDecklistRef?: {
    decklistId?: unknown
    listKind?: unknown
    variantId?: unknown
  } | null
  /**
   * Guardado iniciado por el jugador (p. ej. PUT /my-deck). Si el owner precargó
   * sprites en reporte manual, el jugador igual puede ganar el bono una vez.
   */
  userInitiatedSave?: boolean
}): DeckContributionAwardPlan[] {
  if (!isOfficialTournamentForContribution(input.tournamentOrigin)) {
    return []
  }

  const plans: DeckContributionAwardPlan[] = []
  const hadSlugs = input.previousSlugs.some(s => s.trim())
  const hasSlugs = input.nextSlugs.some(s => s.trim())
  const userSave = input.userInitiatedSave === true

  if (hasSlugs && (!hadSlugs || userSave)) {
    plans.push({ action: 'own_deck_reported' })
  }

  const prevRefKey = input.previousDecklistRef
    ? decklistRefKey(input.previousDecklistRef)
    : null
  const nextRefKey = input.nextDecklistRef
    ? decklistRefKey(input.nextDecklistRef)
    : null

  if (nextRefKey && (nextRefKey !== prevRefKey || userSave)) {
    plans.push({ action: 'decklist_ref' })
  }

  return plans
}
