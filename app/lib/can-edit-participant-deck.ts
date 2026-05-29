/**
 * Si el jugador inscrito puede editar sprites / referencia de decklist.
 * Con torneo cerrado solo si realmente jugó (`myPlayedTournament`).
 */
export function canEditParticipantDeck(input: {
  myRegistration: string | null
  kind: string
  game: string
  state?: string
  myPlayedTournament?: boolean
}): boolean {
  if (
    !Boolean(input.myRegistration) ||
    input.kind !== 'tournament' ||
    input.game !== 'pokemon'
  ) {
    return false
  }
  if (input.state === 'close') {
    return Boolean(input.myPlayedTournament)
  }
  return true
}
