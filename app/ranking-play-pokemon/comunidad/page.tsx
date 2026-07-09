import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import PlayPokemonCommunityRankingClient from '@/components/play-pokemon/PlayPokemonCommunityRankingClient'

export const metadata: Metadata = buildPageMetadata({
  title: 'Ranking de jugadores',
  description:
    'Jugadores de la comunidad que comparten su clasificación de Championship Points en Nexo.',
  path: '/ranking-play-pokemon/comunidad'
})

export default function PlayPokemonCommunityRankingPage() {
  return <PlayPokemonCommunityRankingClient />
}
