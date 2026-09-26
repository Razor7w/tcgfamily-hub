import type { CardSingleDTO } from '@/lib/card-single-dto'

/** Misma carta impresa (variantes = idioma/estado/precio distintos). */
export function cardSingleGroupKey(s: {
  set: string
  number: string
  limitlessId: number
  region: string
}): string {
  return [
    String(s.limitlessId || 0),
    String(s.set ?? '')
      .trim()
      .toUpperCase(),
    String(s.number ?? '').trim(),
    String(s.region ?? 'int')
      .trim()
      .toLowerCase() || 'int'
  ].join('|')
}

export type CardSingleGroup = {
  key: string
  name: string
  set: string
  number: string
  imageUrl: string
  marketPriceUsd: number | null
  totalQuantity: number
  variants: CardSingleDTO[]
}

export function groupCardSingles(singles: CardSingleDTO[]): CardSingleGroup[] {
  const map = new Map<string, CardSingleGroup>()
  for (const s of singles) {
    const key = cardSingleGroupKey(s)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        key,
        name: s.name,
        set: s.set,
        number: s.number,
        imageUrl: s.imageUrl,
        marketPriceUsd: s.marketPriceUsd,
        totalQuantity: s.quantity,
        variants: [s]
      })
      continue
    }
    existing.variants.push(s)
    existing.totalQuantity += s.quantity
    if (!existing.marketPriceUsd && s.marketPriceUsd != null) {
      existing.marketPriceUsd = s.marketPriceUsd
    }
  }
  return [...map.values()]
}
