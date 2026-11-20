import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import PublicPreconTimer from './PublicPreconTimer'

type PageProps = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { token } = await params
  return buildPageMetadata({
    title: 'Reloj de la ronda',
    description: 'Cuenta regresiva en vivo de la ronda de precon.',
    path: `/precon/${token}`,
    noIndex: true
  })
}

export default async function PublicPreconTimerPage({ params }: PageProps) {
  const { token: raw } = await params
  const token = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return <PublicPreconTimer token={token} />
}
