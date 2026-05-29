export type TournamentContributionOrigin = 'official' | 'custom'

export function resolveTournamentContributionOrigin(
  raw: unknown
): TournamentContributionOrigin {
  return raw === 'custom' ? 'custom' : 'official'
}

/** Puntos de contribución por reportes de torneo solo en eventos oficiales de tienda. */
export function isOfficialTournamentForContribution(
  origin: TournamentContributionOrigin
): boolean {
  return origin === 'official'
}
