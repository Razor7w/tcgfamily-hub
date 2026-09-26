import type { Metadata } from 'next'
import PublicCarpetaSinglesClient from './PublicCarpetaSinglesClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return {
    title: slug ? `Singles · ${slug}` : 'Singles',
    description: 'Carpeta pública de singles a la venta.'
  }
}

export default async function PublicCarpetaPage({ params }: PageProps) {
  const { slug: raw } = await params
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return <PublicCarpetaSinglesClient slug={slug} />
}
