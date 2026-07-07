/** Claves estables para idempotencia del ledger (una vez por acción lógica). */

export function contributionDedupeOwnDeck(
  storeId: string,
  userId: string,
  eventId: string
): string {
  return `${storeId}:${userId}:event:${eventId}:own_deck`
}

export function contributionDedupeDecklistRef(
  storeId: string,
  userId: string,
  eventId: string
): string {
  return `${storeId}:${userId}:event:${eventId}:decklist_ref`
}

export function contributionDedupeOpponentSprites(
  storeId: string,
  userId: string,
  eventId: string,
  roundNum: number
): string {
  return `${storeId}:${userId}:event:${eventId}:round:${roundNum}:opponent_sprites`
}

export function contributionDedupeRoundComplete(
  storeId: string,
  userId: string,
  eventId: string,
  roundNum: number
): string {
  return `${storeId}:${userId}:event:${eventId}:round:${roundNum}:round_complete`
}

export function contributionDedupeMailReceivedInStore(
  storeId: string,
  userId: string,
  mailId: string
): string {
  return `${storeId}:${userId}:mail:${mailId}:received_in_store`
}

export function contributionDedupeMailWithdrawnInStore(
  storeId: string,
  userId: string,
  mailId: string
): string {
  return `${storeId}:${userId}:mail:${mailId}:withdrawn_in_store`
}

export function contributionDedupeTournamentPreRegistered(
  storeId: string,
  userId: string,
  eventId: string
): string {
  return `${storeId}:${userId}:event:${eventId}:pre_registered`
}

export function contributionDedupeTournamentParticipated(
  storeId: string,
  userId: string,
  eventId: string
): string {
  return `${storeId}:${userId}:event:${eventId}:participated`
}

export function contributionDedupeTournamentCustomLinked(
  storeId: string,
  userId: string,
  customEventId: string,
  officialEventId: string
): string {
  return `${storeId}:${userId}:custom:${customEventId}:linked:${officialEventId}`
}
