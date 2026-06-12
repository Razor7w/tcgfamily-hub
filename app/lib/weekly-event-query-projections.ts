/**
 * Proyecciones `.select()` para WeeklyEvent: menos bytes desde Mongo y menos CPU
 * serializando roundSnapshots cuando no hacen falta en listados.
 */

/** Participante mínimo para listados públicos y reportes de torneo. */
export const weeklyEventParticipantListProjection = {
  'participants.displayName': 1,
  'participants.userId': 1,
  'participants.confirmed': 1,
  'participants.popId': 1,
  'participants.table': 1,
  'participants.opponentId': 1,
  'participants.wins': 1,
  'participants.losses': 1,
  'participants.ties': 1,
  'participants.deckPokemonSlugs': 1,
  'participants.matchRounds': 1,
  'participants.manualPlacement': 1,
  'participants.tournamentDecklistRef': 1
} as const

/**
 * Listados semanales / home / reportes: standings TDF bastan para clasificación;
 * roundSnapshots solo en detalle o estadísticas con emparejamientos enriquecidos.
 */
export const weeklyEventListProjection = {
  startsAt: 1,
  title: 1,
  kind: 1,
  game: 1,
  pokemonSubtype: 1,
  state: 1,
  priceClp: 1,
  maxParticipants: 1,
  formatNotes: 1,
  prizesNotes: 1,
  location: 1,
  roundNum: 1,
  dashboardRoundCap: 1,
  tournamentStandings: 1,
  tournamentOrigin: 1,
  storeId: 1,
  leagueId: 1,
  ...weeklyEventParticipantListProjection
} as const

/** Resumen de mazos (`aggregateMyDeckStats`): sin snapshots TDF. */
export const weeklyEventMatchupOverviewProjection = {
  startsAt: 1,
  tournamentOrigin: 1,
  'participants.userId': 1,
  'participants.matchRounds': 1,
  'participants.deckPokemonSlugs': 1
} as const

/** Detalle rival/matchup: necesita snapshots para enriquecer bitácora oficial. */
export const weeklyEventMatchupDetailProjection = {
  ...weeklyEventMatchupOverviewProjection,
  state: 1,
  roundSnapshots: 1,
  'participants.popId': 1,
  'participants.displayName': 1
} as const
