import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import TournamentMetaPageContent from '@/components/events/TournamentMetaPageContent'

export const metadata: Metadata = buildPageMetadata({
  title: 'Meta del torneo',
  path: '/dashboard/torneos-semana/meta',
  noIndex: true
})

export default function TournamentMetaPage() {
  return <TournamentMetaPageContent />
}
