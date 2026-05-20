/** Si el jugador inscrito puede editar sprites / referencia de decklist en un torneo. */
export function canEditParticipantDeck(input: {
  myRegistration: string | null
  kind: string
  game: string
  state: string
}): boolean {
  return (
    Boolean(input.myRegistration) &&
    input.kind === 'tournament' &&
    input.game === 'pokemon' &&
    input.state !== 'close'
  )
}
