'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import PublicCarpetaSinglesClient, {
  type BinderNavItem
} from '@/carpetas/[slug]/PublicCarpetaSinglesClient'
import { sellerPublicPath } from '@/lib/seller-slug'

type SellerResponse = {
  seller: { slug: string; name: string }
  binders: BinderNavItem[]
}

export default function PublicVendedorBinderPage({
  params
}: {
  params: Promise<{ slug: string; binderSlug: string }>
}) {
  const { slug: sellerRaw, binderSlug: binderRaw } = use(params)
  const sellerSlug =
    typeof sellerRaw === 'string' ? sellerRaw.trim().toLowerCase() : ''
  const binderSlug =
    typeof binderRaw === 'string' ? binderRaw.trim().toLowerCase() : ''

  const { data: binderNav = [] } = useQuery({
    queryKey: ['public', 'vendedores', sellerSlug, 'binders'],
    enabled: Boolean(sellerSlug),
    queryFn: async (): Promise<BinderNavItem[]> => {
      const res = await fetch(
        `/api/public/vendedores/${encodeURIComponent(sellerSlug)}`
      )
      const json = (await res.json().catch(() => ({}))) as SellerResponse
      if (!res.ok) return []
      return json.binders ?? []
    }
  })

  return (
    <PublicCarpetaSinglesClient
      slug={binderSlug}
      binderNav={binderNav}
      sellerHomePath={sellerSlug ? sellerPublicPath(sellerSlug) : undefined}
    />
  )
}
