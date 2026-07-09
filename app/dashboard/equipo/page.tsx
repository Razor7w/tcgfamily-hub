import { Suspense } from 'react'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/site-metadata'
import EquipoDashboardClient from './EquipoDashboardClient'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'

export const metadata: Metadata = buildPageMetadata({
  title: 'Equipo',
  description: 'Crea tu equipo, invita jugadores y gestiona el roster.',
  path: '/dashboard/equipo',
  noIndex: true
})

export default function EquipoDashboardPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      }
    >
      <EquipoDashboardClient />
    </Suspense>
  )
}
