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
import { startOfWeekMonday } from '@/components/events/weekUtils'
import { alpha } from '@mui/material'

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
  const [allTimeMode, setAllTimeMode] = useState(false)

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
        background: t =>
          `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2.5}>
          <Stack spacing={2.5} sx={{ mb: { xs: 1.5, sm: 2.5 } }}>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.375rem', sm: '2.125rem' },
                  lineHeight: { xs: 1.25, sm: 1.2 },
                  letterSpacing: { xs: '-0.02em', sm: 'inherit' }
                }}
              >
                {allTimeMode ? 'Todos tus torneos' : 'Tus torneos de la semana'}
              </Typography>
              {allTimeMode ? (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: { xs: 'block', sm: 'none' },
                      mt: 1,
                      lineHeight: 1.55,
                      maxWidth: '42rem'
                    }}
                  >
                    Oficiales y custom, más recientes primero. Para volver al
                    calendario semanal usa «Vista por semana» en la tarjeta.
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      maxWidth: 720,
                      mt: 1.25,
                      lineHeight: 1.6
                    }}
                  >
                    Vista de todos tus torneos en los que participas (oficiales
                    y custom), más recientes primero. Usa «Vista por semana» en
                    la tarjeta para volver al calendario semanal.
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: 720,
                    mt: { xs: 1, sm: 1.25 },
                    lineHeight: 1.6,
                    fontSize: { xs: '0.9375rem', sm: '1rem' }
                  }}
                >
                  Elige la semana y separa torneos del calendario de la tienda
                  de los que registras como custom. En cada tarjeta verás récord
                  y detalle al abrir la vista completa.
                </Typography>
              )}
            </Box>
          </Stack>

          {!allTimeMode ? (
            <WeekAnchorToolbar
              weekAnchor={weekAnchor}
              onWeekAnchorChange={setWeekAnchor}
            />
          ) : null}

          <TournamentWeekReportSection
            key={
              allTimeMode
                ? 'all-time'
                : String(startOfWeekMonday(weekAnchor).getTime())
            }
            weekAnchor={weekAnchor}
            allTimeMode={allTimeMode}
            onAllTimeModeChange={setAllTimeMode}
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
