'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import SeasonPeriodFilter from '@/components/dashboard/SeasonPeriodFilter'
import SeasonRoundsTable from '@/components/dashboard/SeasonRoundsTable'
import ReportCustomTournamentDialog from '@/components/events/ReportCustomTournamentDialog'
import { useMySeasonRounds } from '@/hooks/useWeeklyEvents'
import {
  SEASON_PERIOD_LABELS,
  parseSeasonPeriod,
  type SeasonPeriod
} from '@/lib/player-season-summary-types'

function PartidasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const period = useMemo(
    () => parseSeasonPeriod(searchParams.get('period')),
    [searchParams]
  )
  const [customOpen, setCustomOpen] = useState(false)
  const [weekAnchor] = useState(() => new Date())

  const { data, isPending, isError, error } = useMySeasonRounds(period)

  const handlePeriodChange = (next: SeasonPeriod) => {
    router.replace(`/dashboard/mi-cuenta/partidas?period=${next}`)
  }

  const rounds = data?.rounds ?? []

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        py: { xs: 2, sm: 4 },
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`
      })}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Button
            component={Link}
            href="/dashboard/mi-cuenta"
            startIcon={<ArrowBackIcon />}
            size="small"
            sx={t => ({
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 40,
              px: { xs: 0.5, sm: 1.5 },
              '& .MuiButton-startIcon': {
                mr: { xs: 0.5, sm: 1 }
              },
              '&:hover': {
                bgcolor: alpha(t.palette.primary.main, 0.08),
                color: 'primary.main'
              }
            })}
          >
            <Box
              component="span"
              sx={{ display: { xs: 'none', sm: 'inline' } }}
            >
              Volver a tu actividad
            </Box>
            <Box
              component="span"
              sx={{ display: { xs: 'inline', sm: 'none' } }}
            >
              Tu actividad
            </Box>
          </Button>
        </Stack>

        <Stack spacing={{ xs: 2, sm: 2.5 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <SportsEsportsIcon
                sx={{
                  fontSize: { xs: 24, sm: 32 },
                  color: 'primary.main',
                  flexShrink: 0
                }}
              />
              <Typography
                variant="h5"
                component="h1"
                fontWeight={900}
                sx={{
                  fontSize: { xs: '1.25rem', sm: '2.125rem' },
                  letterSpacing: '-0.02em',
                  textWrap: 'balance'
                }}
              >
                Partidas
              </Typography>
            </Stack>
            <IconButton
              color="primary"
              onClick={() => setCustomOpen(true)}
              aria-label="Reportar torneo"
              sx={t => ({
                flexShrink: 0,
                display: { xs: 'inline-flex', sm: 'none' },
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: `0 4px 14px ${alpha(t.palette.primary.main, 0.35)}`,
                '&:hover': { bgcolor: 'primary.dark' }
              })}
            >
              <AddIcon fontSize="small" />
            </IconButton>
            <Button
              variant="contained"
              size="small"
              onClick={() => setCustomOpen(true)}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                textTransform: 'none',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              Reportar torneo
            </Button>
          </Stack>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 520 }}
          >
            Mesas reportadas en {SEASON_PERIOD_LABELS[period].toLowerCase()}.
          </Typography>

          <SeasonPeriodFilter
            value={period}
            onChange={handlePeriodChange}
            compact
          />

          {isError ? (
            <Alert severity="error">
              {error instanceof Error
                ? error.message
                : 'No se pudieron cargar las partidas'}
            </Alert>
          ) : null}

          {isPending ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress size={36} />
            </Stack>
          ) : (
            <Paper
              variant="outlined"
              sx={t => ({
                borderRadius: 2,
                overflow: 'hidden',
                borderColor: alpha(t.palette.text.primary, 0.1)
              })}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.75,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="h6" component="h2" fontWeight={800}>
                  {rounds.length} partida{rounds.length === 1 ? '' : 's'}
                </Typography>
              </Box>

              {rounds.length === 0 ? (
                <Box sx={{ p: 2.5 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    No hay mesas reportadas en este periodo. Abre un torneo y
                    registra tus rondas en la bitácora.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      component={Link}
                      href="/dashboard/torneos-semana"
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Ver mis torneos
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setCustomOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Reportar torneo
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <SeasonRoundsTable rounds={rounds} />
              )}
            </Paper>
          )}
        </Stack>
      </Container>

      <ReportCustomTournamentDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        weekAnchor={weekAnchor}
        onCreated={eventId => {
          router.push(`/dashboard/torneos-semana/${eventId}`)
        }}
      />
    </Box>
  )
}

export default function MiCuentaPartidasPage() {
  return (
    <Suspense
      fallback={
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      }
    >
      <PartidasContent />
    </Suspense>
  )
}
