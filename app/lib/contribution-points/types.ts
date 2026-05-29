export const CONTRIBUTION_POINT_CATEGORIES = [
  'tournament',
  'tournament_deck',
  'tournament_log',
  'mail'
] as const

export type ContributionPointCategory =
  (typeof CONTRIBUTION_POINT_CATEGORIES)[number]

export const CONTRIBUTION_POINT_ACTIONS = [
  'own_deck_reported',
  'decklist_ref',
  'opponent_sprites',
  'round_complete',
  'mail_received_in_store',
  'mail_withdrawn_in_store',
  'tournament_pre_registered',
  'tournament_participated'
] as const

export type ContributionPointAction =
  (typeof CONTRIBUTION_POINT_ACTIONS)[number]

export const CONTRIBUTION_POINT_SOURCE_TYPES = ['weekly_event', 'mail'] as const

export type ContributionPointSourceType =
  (typeof CONTRIBUTION_POINT_SOURCE_TYPES)[number]

export const CONTRIBUTION_CATEGORY_LABELS: Record<
  ContributionPointCategory,
  string
> = {
  tournament: 'Torneos',
  tournament_deck: 'Mi torneo',
  tournament_log: 'Bitácora',
  mail: 'Correo'
}

export const CONTRIBUTION_ACTION_LABELS: Record<
  ContributionPointAction,
  string
> = {
  own_deck_reported: 'Mazo reportado (torneo oficial)',
  decklist_ref: 'Decklist vinculada (torneo oficial)',
  opponent_sprites: 'Sprites del rival (torneo oficial)',
  round_complete: 'Ronda completa (torneo oficial)',
  mail_received_in_store: 'Correo recibido en tienda',
  mail_withdrawn_in_store: 'Correo retirado en tienda',
  tournament_pre_registered: 'Preinscripción web en torneo oficial',
  tournament_participated: 'Torneo oficial cerrado (inscrito con cuenta)'
}
