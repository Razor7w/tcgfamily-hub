'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { CardSingleCondition } from '@/lib/card-single-condition'
import type { CardSingleLanguage } from '@/lib/card-single-language'

export type SellerInterestItem = {
  id: string
  kind: 'single' | 'photo'
  name: string
  set?: string
  number?: string
  language?: CardSingleLanguage
  condition?: CardSingleCondition
  quantity?: number
  priceClp?: number
  description?: string
  binderSlug?: string
  binderName?: string
}

type Ctx = {
  sellerSlug: string
  items: SellerInterestItem[]
  selectedIds: Set<string>
  toggle: (item: SellerInterestItem) => void
  clear: () => void
  isSelected: (id: string) => boolean
}

const SellerInterestContext = createContext<Ctx | null>(null)

function storageKey(sellerSlug: string) {
  return `tcg-seller-interest:${sellerSlug}`
}

function normalizeItem(raw: unknown): SellerInterestItem | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  if (typeof x.id !== 'string' || typeof x.name !== 'string') return null
  const kind = x.kind === 'photo' ? 'photo' : 'single'
  return {
    id: x.id,
    kind,
    name: x.name,
    set: typeof x.set === 'string' ? x.set : undefined,
    number: typeof x.number === 'string' ? x.number : undefined,
    language:
      typeof x.language === 'string'
        ? (x.language as CardSingleLanguage)
        : undefined,
    condition:
      typeof x.condition === 'string'
        ? (x.condition as CardSingleCondition)
        : undefined,
    quantity: typeof x.quantity === 'number' ? x.quantity : undefined,
    priceClp: typeof x.priceClp === 'number' ? x.priceClp : undefined,
    description:
      typeof x.description === 'string' ? x.description : undefined,
    binderSlug: typeof x.binderSlug === 'string' ? x.binderSlug : undefined,
    binderName: typeof x.binderName === 'string' ? x.binderName : undefined
  }
}

function readStored(sellerSlug: string): SellerInterestItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(sellerSlug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeItem)
      .filter((x): x is SellerInterestItem => Boolean(x))
  } catch {
    return []
  }
}

export function SellerInterestProvider({
  sellerSlug,
  children
}: {
  sellerSlug: string
  children: ReactNode
}) {
  const [items, setItems] = useState<SellerInterestItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(readStored(sellerSlug))
    setHydrated(true)
  }, [sellerSlug])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(storageKey(sellerSlug), JSON.stringify(items))
    } catch {
      // ignore quota
    }
  }, [items, sellerSlug, hydrated])

  const toggle = useCallback((item: SellerInterestItem) => {
    setItems(prev => {
      const exists = prev.some(x => x.id === item.id)
      if (exists) return prev.filter(x => x.id !== item.id)
      return [...prev, item]
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const selectedIds = useMemo(
    () => new Set(items.map(i => i.id)),
    [items]
  )

  const value = useMemo<Ctx>(
    () => ({
      sellerSlug,
      items,
      selectedIds,
      toggle,
      clear,
      isSelected: (id: string) => selectedIds.has(id)
    }),
    [sellerSlug, items, selectedIds, toggle, clear]
  )

  return (
    <SellerInterestContext.Provider value={value}>
      {children}
    </SellerInterestContext.Provider>
  )
}

export function useSellerInterest(): Ctx {
  const ctx = useContext(SellerInterestContext)
  if (!ctx) {
    throw new Error('useSellerInterest must be used within SellerInterestProvider')
  }
  return ctx
}

export function useOptionalSellerInterest(): Ctx | null {
  return useContext(SellerInterestContext)
}
