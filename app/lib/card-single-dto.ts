import type { CardSingleCondition } from '@/lib/card-single-condition'
import {
  isCardSingleLanguage,
  type CardSingleLanguage
} from '@/lib/card-single-language'
import { cardBinderPublicPath } from '@/lib/card-binder-slug'
import { limitlessCardImageUrl } from '@/lib/decklist'

export type CardSingleDTO = {
  id: string
  binderId: string
  userId: string
  storeId: string | null
  limitlessId: number
  set: string
  number: string
  region: string
  name: string
  cardType: string
  condition: CardSingleCondition
  language: CardSingleLanguage
  priceClp: number
  compareAtPriceClp: number | null
  quantity: number
  published: boolean
  note: string
  marketPriceUsd: number | null
  interestCount: number
  imageUrl: string
  createdAt: string
  updatedAt: string
}

export type CardBinderDTO = {
  id: string
  name: string
  slug: string
  description: string
  publicPath: string
  singleCount?: number
  publishedCount?: number
  createdAt: string
  updatedAt: string
}

export function toCardBinderDTO(
  doc: {
    _id: { toString(): string }
    name: string
    slug?: string
    description?: string
    createdAt?: Date
    updatedAt?: Date
  },
  counts?: { total?: number; published?: number }
): CardBinderDTO {
  const slug = String(doc.slug ?? '')
    .trim()
    .toLowerCase()
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug,
    description: doc.description ?? '',
    publicPath: slug ? cardBinderPublicPath(slug) : '',
    singleCount: counts?.total,
    publishedCount: counts?.published,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString()
  }
}

type SingleLean = {
  _id: { toString(): string }
  binderId: { toString(): string }
  userId: { toString(): string }
  storeId?: { toString(): string } | null
  limitlessId: number
  setCode?: string
  set?: string
  number: string
  region: string
  name: string
  cardType?: string
  condition: CardSingleCondition
  language?: string
  priceClp: number
  compareAtPriceClp?: number | null
  quantity: number
  published: boolean
  note?: string
  marketPriceUsd?: number | null
  interestCount?: number
  createdAt?: Date
  updatedAt?: Date
}

export function toCardSingleDTO(doc: SingleLean): CardSingleDTO {
  const set = String(doc.setCode ?? doc.set ?? '').trim()
  const number = String(doc.number ?? '').trim()
  const name = String(doc.name ?? '').trim()
  const priceClp = Math.max(0, Math.round(Number(doc.priceClp) || 0))
  const rawCompare =
    doc.compareAtPriceClp != null &&
    Number.isFinite(Number(doc.compareAtPriceClp))
      ? Math.max(0, Math.round(Number(doc.compareAtPriceClp)))
      : null
  const compareAtPriceClp =
    rawCompare != null && rawCompare > priceClp ? rawCompare : null
  const language: CardSingleLanguage = isCardSingleLanguage(doc.language)
    ? doc.language
    : 'EN'
  return {
    id: doc._id.toString(),
    binderId: doc.binderId.toString(),
    userId: doc.userId.toString(),
    storeId: doc.storeId ? doc.storeId.toString() : null,
    limitlessId: Number(doc.limitlessId) || 0,
    set,
    number,
    region: String(doc.region ?? 'int').trim() || 'int',
    name,
    cardType: String(doc.cardType ?? '').trim(),
    condition: doc.condition,
    language,
    priceClp,
    compareAtPriceClp,
    quantity: Math.max(1, Math.round(Number(doc.quantity) || 1)),
    published: Boolean(doc.published),
    note: String(doc.note ?? '').trim(),
    marketPriceUsd:
      doc.marketPriceUsd != null && Number.isFinite(Number(doc.marketPriceUsd))
        ? Number(doc.marketPriceUsd)
        : null,
    interestCount: Math.max(0, Math.round(Number(doc.interestCount) || 0)),
    imageUrl: limitlessCardImageUrl({
      set,
      number,
      size: 'SM',
      cardName: name
    }),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString()
  }
}
