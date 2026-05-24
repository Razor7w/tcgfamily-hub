import { winRatePercent } from '@/lib/pokemon-matchup-stats'

export type TournamentMetagameVariantRowDTO = {
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
  variants: TournamentMetagameVariantRowDTO[]
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

/** Agrupa metagame por el primer Pokémon del deck (sprite 1). */
export function primaryDeckSpriteKey(slugs: string[]): string {
  const first = slugs.map(s => s.trim().toLowerCase()).find(s => s.length > 0)
  return first ?? '__empty__'
}

/** Clave de variante respetando el orden reportado (sprites 1 y 2). */
export function variantDeckKey(slugs: string[]): string {
  const ordered = slugs
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)
  return ordered.join('|') || '__empty__'
}

export function deckNameFromPrimarySpriteKey(deckKey: string): string {
  if (deckKey === '__empty__') return 'Sin deck'
  return slugToTitle(deckKey)
}

type MetagameStatsAcc = {
  count: number
  wins: number
  losses: number
  ties: number
}

type MetagameParticipantInput = {
  deckPokemonSlugs: string[]
  matchRecord: { wins: number; losses: number; ties: number } | null
}

function normalizeDeckSlugs(slugs: string[]): string[] {
  return slugs.map(s => s.trim().toLowerCase()).filter(s => s.length > 0)
}

function addParticipantToAcc(
  acc: MetagameStatsAcc,
  matchRecord: MetagameParticipantInput['matchRecord']
): void {
  acc.count++
  const rec = matchRecord ?? { wins: 0, losses: 0, ties: 0 }
  acc.wins += rec.wins
  acc.losses += rec.losses
  acc.ties += rec.ties
}

function statsToWinPercent(acc: MetagameStatsAcc): number | null {
  const rate = winRatePercent(acc.wins, acc.losses, acc.ties)
  return rate ?? (acc.count > 0 ? 0 : null)
}

function buildMetagameVariantRow(
  deckKey: string,
  deckSlugs: string[],
  acc: MetagameStatsAcc,
  fieldTotal: number
): TournamentMetagameVariantRowDTO {
  return {
    deckKey,
    deckSlugs,
    deckName: deckNameFromSlugs(deckSlugs),
    count: acc.count,
    sharePercent: (acc.count / fieldTotal) * 100,
    wins: acc.wins,
    losses: acc.losses,
    ties: acc.ties,
    winPercent: statsToWinPercent(acc)
  }
}

export function aggregateTournamentMetagame(
  participants: MetagameParticipantInput[]
): TournamentMetagameRowDTO[] {
  const eligible = participants.filter(p => p.deckPokemonSlugs.length > 0)
  const fieldTotal = eligible.length
  if (fieldTotal === 0) return []

  const primaryMap = new Map<
    string,
    MetagameStatsAcc & {
      variants: Map<string, MetagameStatsAcc & { deckSlugs: string[] }>
    }
  >()

  for (const p of eligible) {
    const slugs = normalizeDeckSlugs(p.deckPokemonSlugs)
    const primaryKey = primaryDeckSpriteKey(slugs)
    const variantKey = variantDeckKey(slugs)

    let primary = primaryMap.get(primaryKey)
    if (!primary) {
      primary = {
        count: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        variants: new Map()
      }
      primaryMap.set(primaryKey, primary)
    }
    addParticipantToAcc(primary, p.matchRecord)

    let variant = primary.variants.get(variantKey)
    if (!variant) {
      variant = {
        count: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        deckSlugs: slugs
      }
      primary.variants.set(variantKey, variant)
    }
    addParticipantToAcc(variant, p.matchRecord)
  }

  const rows: TournamentMetagameRowDTO[] = []
  for (const [deckKey, primary] of primaryMap) {
    const deckSlugs = deckKey === '__empty__' ? [] : [deckKey]
    const variantRows = [...primary.variants.entries()]
      .map(([variantKey, acc]) =>
        buildMetagameVariantRow(variantKey, acc.deckSlugs, acc, fieldTotal)
      )
      .sort((a, b) => b.count - a.count || b.sharePercent - a.sharePercent)

    const soleVariant = variantRows.length === 1 ? variantRows[0] : null
    const showVariantBreakdown = variantRows.length > 1

    rows.push({
      deckKey,
      deckSlugs: soleVariant?.deckSlugs ?? deckSlugs,
      deckName: soleVariant?.deckName ?? deckNameFromPrimarySpriteKey(deckKey),
      count: primary.count,
      sharePercent: (primary.count / fieldTotal) * 100,
      wins: primary.wins,
      losses: primary.losses,
      ties: primary.ties,
      winPercent: statsToWinPercent(primary),
      variants: showVariantBreakdown ? variantRows : []
    })
  }

  rows.sort((a, b) => b.count - a.count || b.sharePercent - a.sharePercent)
  return rows
}
