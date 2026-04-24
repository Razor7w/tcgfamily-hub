import { parseDecklistText } from '@/lib/decklist'

export type CardKey = `${string}:${number}`

export type AggregatedCard = {
  key: CardKey
  count: number
  name: string
  set: string
  number: number
}

function aggregateDeck(text: string): Map<CardKey, AggregatedCard> {
  const parsed = parseDecklistText(text)
  const map = new Map<CardKey, AggregatedCard>()
  for (const sec of parsed.sections) {
    for (const line of sec.cards) {
      const key = `${line.set}:${line.number}` as CardKey
      const prev = map.get(key)
      if (prev) {
        prev.count += line.count
      } else {
        map.set(key, {
          key,
          count: line.count,
          name: line.name,
          set: line.set,
          number: line.number
        })
      }
    }
  }
  return map
}

function sortCards(list: AggregatedCard[]): AggregatedCard[] {
  return [...list].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'es') ||
      a.set.localeCompare(b.set, 'es') ||
      a.number - b.number
  )
}

export type CountChangeRow = {
  card: AggregatedCard
  countA: number
  countB: number
}

export type DecklistDiffResult = {
  onlyInA: AggregatedCard[]
  onlyInB: AggregatedCard[]
  countChanged: CountChangeRow[]
  identical: boolean
}

/**
 * Compara dos textos de decklist por carta (set + número).
 */
export function compareDecklistTexts(
  textA: string,
  textB: string
): DecklistDiffResult {
  const a = aggregateDeck(textA)
  const b = aggregateDeck(textB)
  const keys = new Set<CardKey>([...a.keys(), ...b.keys()])
  const onlyInA: AggregatedCard[] = []
  const onlyInB: AggregatedCard[] = []
  const countChanged: CountChangeRow[] = []

  for (const key of keys) {
    const ca = a.get(key)
    const cb = b.get(key)
    if (ca && !cb) onlyInA.push(ca)
    else if (!ca && cb) onlyInB.push(cb)
    else if (ca && cb && ca.count !== cb.count) {
      countChanged.push({
        card: { ...ca },
        countA: ca.count,
        countB: cb.count
      })
    }
  }

  const result = {
    onlyInA: sortCards(onlyInA),
    onlyInB: sortCards(onlyInB),
    countChanged: countChanged.sort((x, y) =>
      x.card.name.localeCompare(y.card.name, 'es')
    ),
    identical: false
  }
  result.identical =
    result.onlyInA.length === 0 &&
    result.onlyInB.length === 0 &&
    result.countChanged.length === 0
  return result
}
