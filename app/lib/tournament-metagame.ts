import {
  opponentDeckKey,
  slugsDisplayOrderForDeckKey,
  winRatePercent
} from '@/lib/pokemon-matchup-stats'
export type TournamentMetagameRowDTO = {
  deckKey: string
  deckSlugs: string[]
  deckName: string
  count: number
  sharePercent: number
  wins: number
  losses: number
  ties: number
  winPercent: number | null
}

export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Nombre de arquetipo para metagame (ej. «Hydrapple Ogerpon»). */
export function deckNameFromSlugs(slugs: string[]): string {
  if (slugs.length === 0) return 'Sin deck'
  return slugs.map(slugToTitle).join(' ')
}

type MetagameParticipantInput = {
  deckPokemonSlugs: string[]
  matchRecord: { wins: number; losses: number; ties: number } | null
}

export function aggregateTournamentMetagame(
  participants: MetagameParticipantInput[]
): TournamentMetagameRowDTO[] {
  const eligible = participants.filter(p => p.deckPokemonSlugs.length > 0)
  const fieldTotal = eligible.length
  if (fieldTotal === 0) return []

  const map = new Map<
    string,
    {
      count: number
      wins: number
      losses: number
      ties: number
      firstRawSlugs: string[]
    }
  >()

  for (const p of eligible) {
    const key = opponentDeckKey(p.deckPokemonSlugs)
    let acc = map.get(key)
    if (!acc) {
      acc = {
        count: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        firstRawSlugs: p.deckPokemonSlugs
      }
      map.set(key, acc)
    }
    acc.count++
    const rec = p.matchRecord
    if (rec) {
      acc.wins += rec.wins
      acc.losses += rec.losses
      acc.ties += rec.ties
    }
  }

  const rows: TournamentMetagameRowDTO[] = []
  for (const [deckKey, acc] of map) {
    const deckSlugs = slugsDisplayOrderForDeckKey(deckKey, acc.firstRawSlugs)
    rows.push({
      deckKey,
      deckSlugs,
      deckName: deckNameFromSlugs(deckSlugs),
      count: acc.count,
      sharePercent: (acc.count / fieldTotal) * 100,
      wins: acc.wins,
      losses: acc.losses,
      ties: acc.ties,
      winPercent: winRatePercent(acc.wins, acc.losses, acc.ties)
    })
  }

  rows.sort((a, b) => b.count - a.count || b.sharePercent - a.sharePercent)
  return rows
}
