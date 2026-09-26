'use client'

import { use, useCallback, useEffect, useState } from 'react'
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

  const [binderNav, setBinderNav] = useState<BinderNavItem[]>([])

  const loadNav = useCallback(async () => {
    if (!sellerSlug) return
    try {
      const res = await fetch(
        `/api/public/vendedores/${encodeURIComponent(sellerSlug)}`
      )
      const json = (await res.json().catch(() => ({}))) as SellerResponse
      if (!res.ok) return
      setBinderNav(json.binders ?? [])
    } catch {
      // ignore; la carpeta igual carga
    }
  }, [sellerSlug])

  useEffect(() => {
    void loadNav()
  }, [loadNav])

  return (
    <PublicCarpetaSinglesClient
      slug={binderSlug}
      binderNav={binderNav}
      sellerHomePath={sellerSlug ? sellerPublicPath(sellerSlug) : undefined}
    />
  )
}
