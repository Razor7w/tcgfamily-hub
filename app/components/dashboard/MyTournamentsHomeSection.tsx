'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import MyTournamentsDashboardSummary from '@/components/dashboard/MyTournamentsDashboardSummary'
import ReportCustomTournamentDialog from '@/components/events/ReportCustomTournamentDialog'
import TournamentWeekReportSection from '@/components/events/TournamentWeekReportSection'
import WeekAnchorToolbar from '@/components/events/WeekAnchorToolbar'

type MyTournamentsHomeSectionProps = {
  /** En la página dedicada muestra selector de semana y listado completo; en el inicio, resumen de los últimos torneos. */
  showPageHeading?: boolean
}

export default function MyTournamentsHomeSection({
  showPageHeading = true
}: MyTournamentsHomeSectionProps) {
  const router = useRouter()
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [customOpen, setCustomOpen] = useState(false)

  if (!showPageHeading) {
    return (
      <Stack spacing={2}>
        <MyTournamentsDashboardSummary
          onCreateCustom={() => setCustomOpen(true)}
        />
        <ReportCustomTournamentDialog
          open={customOpen}
          onClose={() => setCustomOpen(false)}
          weekAnchor={weekAnchor}
          onCreated={eventId => {
            router.push(`/dashboard/torneos-semana/${eventId}`)
          }}
        />
      </Stack>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2.5}>
          <Stack spacing={2.5} sx={{ mb: 2.5 }}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                Tus torneos de la semana
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 720, mt: 1.25, lineHeight: 1.6 }}
              >
                Elige la semana y separa torneos del calendario de la tienda de
                los que registras como custom. En cada tarjeta verás récord y
                detalle al abrir la vista completa.
              </Typography>
            </Box>
          </Stack>

          <WeekAnchorToolbar
            weekAnchor={weekAnchor}
            onWeekAnchorChange={setWeekAnchor}
          />

          <TournamentWeekReportSection
            weekAnchor={weekAnchor}
            onOpenCreateCustomDialog={() => setCustomOpen(true)}
          />

          <ReportCustomTournamentDialog
            open={customOpen}
            onClose={() => setCustomOpen(false)}
            weekAnchor={weekAnchor}
            onCreated={eventId => {
              router.push(`/dashboard/torneos-semana/${eventId}`)
            }}
          />
        </Stack>
      </Container>
    </Box>
  )
}
