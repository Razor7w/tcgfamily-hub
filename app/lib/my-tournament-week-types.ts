import type { TournamentOrigin, WeeklyEventState } from '@/models/WeeklyEvent'

export type MyTournamentWeekItem = {
  eventId: string
  title: string
  startsAt: string
  state: WeeklyEventState
  /** Torneo de la tienda vs torneo personal reportado por el usuario. */
  tournamentOrigin: TournamentOrigin
  myMatchRecord: { wins: number; losses: number; ties: number } | null
  placement: {
    categoryLabel: string
    place: number | null
    isDnf: boolean
  } | null
  /** Slugs reportados (sprites Limitless), si el usuario guardó su deck. */
  deckPokemonSlugs?: string[]
}
