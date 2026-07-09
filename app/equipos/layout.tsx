import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Equipos',
  description: 'Páginas públicas de equipos de jugadores Pokémon TCG.',
  path: '/equipos'
})

export default function EquiposLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
