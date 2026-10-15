import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import Pokedex30Client from './Pokedex30Client'

export const metadata: Metadata = buildPageMetadata({
  title: 'Pokédex 30th Celebration',
  description:
    'Checklist de las cartas de Pokémon TCG 30th Celebration para los jugadores de la tienda.',
  path: '/dashboard/pokedex-30',
  noIndex: true
})

export default function Pokedex30Page() {
  return <Pokedex30Client />
}
