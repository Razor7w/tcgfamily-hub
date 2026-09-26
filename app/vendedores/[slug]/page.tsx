import type { Metadata } from 'next'
import PublicVendedorClient from './PublicVendedorClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return {
    title: slug ? `Vendedor · ${slug}` : 'Vendedor',
    description: 'Carpetas públicas de singles a la venta.'
  }
}

export default async function PublicVendedorPage({ params }: PageProps) {
  const { slug: raw } = await params
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return <PublicVendedorClient slug={slug} />
}
