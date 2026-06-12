/**
 * Proyecciones `.select()` para WeeklyEvent: menos bytes desde Mongo y menos CPU
 * serializando roundSnapshots / matchRounds cuando no hacen falta.
 */

/** Listado semanal: datos de inscripción y récord TDF; sin bitácora ajena. */
export const weeklyEventParticipantWeekListProjection = {
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
  'participants.manualPlacement': 1,
  'participants.tournamentDecklistRef': 1
} as const

/** Reportes «mis torneos» / custom: incluye rondas reportadas por el usuario. */
export const weeklyEventParticipantReportProjection = {
  ...weeklyEventParticipantWeekListProjection,
  'participants.matchRounds': 1
} as const

const weeklyEventCoreFields = {
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
  leagueId: 1
} as const

/** GET /api/events (vista semanal): sin snapshots ni matchRounds ajenos. */
export const weeklyEventWeekListProjection = {
  ...weeklyEventCoreFields,
  ...weeklyEventParticipantWeekListProjection
} as const

/** my-tournaments-* / my-home-tournaments: incluye matchRounds del participante. */
export const weeklyEventTournamentReportProjection = {
  ...weeklyEventCoreFields,
  ...weeklyEventParticipantReportProjection
} as const

/** Alias histórico del reporte. */
export const weeklyEventListProjection = weeklyEventTournamentReportProjection

/** GET /api/events/[id] sin snapshots (segunda query si hace falta). */
export const weeklyEventDetailBaseProjection = {
  ...weeklyEventCoreFields,
  createdByUserId: 1,
  ...weeklyEventParticipantReportProjection
} as const

/** Panel admin listado: sin snapshots TDF (count vía agregación `$size`). */
export const weeklyEventAdminListProjection = {
  ...weeklyEventCoreFields,
  createdAt: 1,
  updatedAt: 1,
  'participants.displayName': 1,
  'participants.userId': 1,
  'participants.createdAt': 1,
  'participants.confirmed': 1,
  'participants.popId': 1,
  'participants.table': 1,
  'participants.opponentId': 1,
  'participants.wins': 1,
  'participants.losses': 1,
  'participants.ties': 1
} as const

/** GET /api/admin/events/[id]: snapshots + clasificación TDF. */
export const weeklyEventAdminDetailProjection = {
  ...weeklyEventAdminListProjection,
  roundSnapshots: 1,
  tournamentStandings: 1
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

/** Clasificación pública de liga: snapshots mínimos para W/L/T (sin syncedAt/skipped/mesa). */
export const weeklyEventLeagueAggregateProjection = {
  title: 1,
  startsAt: 1,
  dashboardRoundCap: 1,
  'roundSnapshots.roundNum': 1,
  'roundSnapshots.pairings.player1PopId': 1,
  'roundSnapshots.pairings.player2PopId': 1,
  'roundSnapshots.pairings.player1Name': 1,
  'roundSnapshots.pairings.player2Name': 1,
  'roundSnapshots.pairings.player1Record': 1,
  'roundSnapshots.pairings.player2Record': 1,
  'roundSnapshots.pairings.isBye': 1,
  'participants.displayName': 1,
  'participants.popId': 1,
  'participants.wins': 1,
  'participants.losses': 1,
  'participants.ties': 1,
  'participants.matchRounds': 1
} as const

/** Meta del torneo (`buildTournamentMetaPayload`). */
export const weeklyEventMetaProjection = {
  storeId: 1,
  startsAt: 1,
  title: 1,
  kind: 1,
  game: 1,
  state: 1,
  tournamentOrigin: 1,
  tournamentStandings: 1,
  roundSnapshots: 1,
  'participants.displayName': 1,
  'participants.userId': 1,
  'participants.popId': 1,
  'participants.deckPokemonSlugs': 1,
  'participants.matchRounds': 1,
  'participants.wins': 1,
  'participants.losses': 1,
  'participants.ties': 1,
  'participants.manualPlacement': 1,
  'participants.tournamentDecklistRef': 1
} as const

/** Preview decklist del participante (`resolveViewAsParticipant`). */
export const weeklyEventDecklistPreviewProjection = {
  state: 1,
  tournamentOrigin: 1,
  createdByUserId: 1,
  'participants.userId': 1,
  'participants.displayName': 1,
  'participants.confirmed': 1,
  'participants.tournamentDecklistRef': 1
} as const

/** Decklist de un rival en meta (sin cargar meta completa). */
export const weeklyEventMetaDecklistProjection = {
  kind: 1,
  game: 1,
  state: 1,
  tournamentOrigin: 1,
  'participants.displayName': 1,
  'participants.userId': 1,
  'participants.tournamentDecklistRef': 1
} as const
