'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
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

const STORAGE_PREFIX = 'tcg-seller-interest:'
const CHANGE_EVENT = 'tcg-seller-interest-changed'

function storageKey(sellerSlug: string) {
  return `${STORAGE_PREFIX}${sellerSlug}`
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
    description: typeof x.description === 'string' ? x.description : undefined,
    binderSlug: typeof x.binderSlug === 'string' ? x.binderSlug : undefined,
    binderName: typeof x.binderName === 'string' ? x.binderName : undefined
  }
}

function parseStoredJson(raw: string): SellerInterestItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeItem)
      .filter((x): x is SellerInterestItem => Boolean(x))
  } catch {
    return []
  }
}

function readSnapshot(sellerSlug: string): string {
  if (typeof window === 'undefined') return '[]'
  try {
    return window.localStorage.getItem(storageKey(sellerSlug)) ?? '[]'
  } catch {
    return '[]'
  }
}

function writeItems(sellerSlug: string, items: SellerInterestItem[]) {
  try {
    window.localStorage.setItem(storageKey(sellerSlug), JSON.stringify(items))
  } catch {
    // ignore quota
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribeInterestStore(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(STORAGE_PREFIX)) onStoreChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, onStoreChange)
  }
}

export function SellerInterestProvider({
  sellerSlug,
  children
}: {
  sellerSlug: string
  children: ReactNode
}) {
  const raw = useSyncExternalStore(
    subscribeInterestStore,
    () => readSnapshot(sellerSlug),
    () => '[]'
  )
  const items = useMemo(() => parseStoredJson(raw), [raw])

  const toggle = useCallback(
    (item: SellerInterestItem) => {
      const exists = items.some(x => x.id === item.id)
      writeItems(
        sellerSlug,
        exists ? items.filter(x => x.id !== item.id) : [...items, item]
      )
    },
    [items, sellerSlug]
  )

  const clear = useCallback(() => {
    writeItems(sellerSlug, [])
  }, [sellerSlug])

  const selectedIds = useMemo(() => new Set(items.map(i => i.id)), [items])

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
    throw new Error(
      'useSellerInterest must be used within SellerInterestProvider'
    )
  }
  return ctx
}

export function useOptionalSellerInterest(): Ctx | null {
  return useContext(SellerInterestContext)
}
