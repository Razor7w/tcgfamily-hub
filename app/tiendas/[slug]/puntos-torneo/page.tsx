import type { Metadata } from 'next'
import PublicTournamentPointsClient from './PublicTournamentPointsClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return {
    title: slug ? `Puntos por torneo · ${slug}` : 'Puntos por torneo',
    description:
      'Ranking público de jugadores con puntos por torneo en la tienda. Sin iniciar sesión.'
  }
}

export default async function PublicTournamentPointsPage({
  params
}: PageProps) {
  const { slug: raw } = await params
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!slug) {
    return <PublicTournamentPointsClient slug="" />
  }
  return <PublicTournamentPointsClient slug={slug} />
}
