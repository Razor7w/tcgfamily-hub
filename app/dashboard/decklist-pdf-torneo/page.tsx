import type { Metadata } from 'next'
import PlayPokemonDecklistPdfPageClient from './PlayPokemonDecklistPdfPageClient'

export const metadata: Metadata = {
  title: 'PDF listas (Play! Pokémon)',
  description: 'Genera la hoja oficial de listas para torneos Play! Pokémon.'
}

export default function PlayPokemonDecklistPdfPage() {
  return <PlayPokemonDecklistPdfPageClient />
}
