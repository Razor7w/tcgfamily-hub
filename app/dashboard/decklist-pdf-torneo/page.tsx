import type { Metadata } from 'next'
import PlayPokemonDecklistPdfPageClient from './PlayPokemonDecklistPdfPageClient'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'PDF listas (Play! Pokémon)',
  description: 'Genera la hoja oficial de listas para torneos Play! Pokémon.',
  path: '/dashboard/decklist-pdf-torneo',
  noIndex: true
})

export default function PlayPokemonDecklistPdfPage() {
  return <PlayPokemonDecklistPdfPageClient />
}
