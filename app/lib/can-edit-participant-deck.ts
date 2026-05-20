/**
 * Si el jugador inscrito puede editar sprites / referencia de decklist.
 * Aplica también con el torneo cerrado (`close`) si sigue en la lista.
 */
export function canEditParticipantDeck(input: {
  myRegistration: string | null
  kind: string
  game: string
  /** Se conserva por compatibilidad con llamadas existentes; ya no restringe por estado. */
  state?: string
}): boolean {
  void input.state
  return (
    Boolean(input.myRegistration) &&
    input.kind === 'tournament' &&
    input.game === 'pokemon'
  )
}
