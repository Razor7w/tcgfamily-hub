import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Ligas',
  description:
    'Clasificaciones y puntos de ligas Pokémon en tiendas asociadas a TCG Nexo.',
  path: '/ligas'
})

export default function LigasLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
