export type MyTournamentPointsEntry = {
  eventId: string
  eventTitle: string
  startsAt: string | null
  place: number
  points: number
  awardedAt: string | null
}

export type MyTournamentPointsData = {
  enabled: boolean
  totalPoints: number
  entries: MyTournamentPointsEntry[]
}
