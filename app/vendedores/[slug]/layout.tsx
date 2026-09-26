'use client'

import { use } from 'react'
import { SellerInterestProvider } from './SellerInterestContext'

export default function VendedorLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug: raw } = use(params)
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!slug) return children
  return (
    <SellerInterestProvider sellerSlug={slug}>{children}</SellerInterestProvider>
  )
}
