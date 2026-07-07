'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AddIcon from '@mui/icons-material/Add'
import BarChartIcon from '@mui/icons-material/BarChart'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import SeasonPeriodFilter from '@/components/dashboard/SeasonPeriodFilter'
import SeasonRoundsTable from '@/components/dashboard/SeasonRoundsTable'
import ReportCustomTournamentDialog from '@/components/events/ReportCustomTournamentDialog'
import { useMySeasonSummary } from '@/hooks/useWeeklyEvents'
import {
  SEASON_PERIOD_LABELS,
  SEASON_TREND_LABELS,
  dashboardStatsHref,
  tuActividadPartidasHref,
  type SeasonPeriod
} from '@/lib/player-season-summary-types'

function formatTrendPct(
  delta: number | null,
  period: SeasonPeriod
): string | null {
  if (delta == null || period === 'all') return null
  const label = SEASON_TREND_LABELS[period]
  const rounded = Math.abs(Math.round(delta))
  if (delta > 0) return `↗ ${rounded}% ${label}`
  if (delta < 0) return `↘ ${rounded}% ${label}`
  return `→ 0% ${label}`
}

function formatTrendWinRate(
  delta: number | null,
  period: SeasonPeriod
): string | null {
  if (delta == null || period === 'all') return null
  const label = SEASON_TREND_LABELS[period]
  const rounded = Math.abs(Math.round(delta * 10) / 10)
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  return `${sign}${rounded} pp ${label}`
}

type KpiCardProps = {
  label: string
  shortLabel?: string
  value: string
  hint?: string
  trend?: string | null
  icon: ReactNode
  progress?: number | null
  /** Texto largo (nombre de mazo) usa tipografía más compacta. */
  valueVariant?: 'metric' | 'title'
}

function KpiCard({
  label,
  shortLabel,
  value,
  hint,
  trend,
  icon,
  progress,
  valueVariant = 'metric'
}: KpiCardProps) {
  const displayLabel = shortLabel ?? label

  return (
    <Paper
      variant="outlined"
      sx={t => ({
        p: { xs: 1.25, sm: 2 },
        borderRadius: 2,
        height: '100%',
        borderColor: alpha(t.palette.text.primary, 0.1),
        bgcolor: t.palette.background.paper
      })}
    >
      <Stack spacing={{ xs: 0.75, sm: 1.25 }} sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={0.75}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              lineHeight: 1.3
            }}
          >
            <Box
              component="span"
              sx={{ display: { xs: 'none', sm: 'inline' } }}
            >
              {label}
            </Box>
            <Box
              component="span"
              sx={{ display: { xs: 'inline', sm: 'none' } }}
            >
              {displayLabel}
            </Box>
          </Typography>
          <Box
            sx={t => ({
              width: { xs: 28, sm: 36 },
              height: { xs: 28, sm: 36 },
              borderRadius: 1.5,
              display: { xs: 'none', sm: 'grid' },
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: alpha(t.palette.primary.main, 0.1),
              flexShrink: 0
            })}
            aria-hidden
          >
            {icon}
          </Box>
        </Stack>
        <Typography
          variant={valueVariant === 'title' ? 'subtitle2' : 'h4'}
          component="p"
          sx={{
            fontWeight: valueVariant === 'title' ? 800 : 900,
            letterSpacing: valueVariant === 'title' ? '-0.02em' : '-0.03em',
            lineHeight: valueVariant === 'title' ? 1.35 : 1.1,
            fontSize:
              valueVariant === 'title'
                ? { xs: '0.875rem', sm: '1rem' }
                : { xs: '1.35rem', sm: '2.125rem' },
            fontVariantNumeric:
              valueVariant === 'metric' ? 'tabular-nums' : undefined,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: valueVariant === 'title' ? 3 : 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {value}
        </Typography>
        {progress != null ? (
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, progress))}
            sx={{
              height: 6,
              borderRadius: 999,
              bgcolor: t => alpha(t.palette.primary.main, 0.12),
              '& .MuiLinearProgress-bar': { borderRadius: 999 }
            }}
          />
        ) : null}
        {trend ? (
          <Typography
            variant="caption"
            color="success.main"
            sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}
          >
            {trend}
          </Typography>
        ) : null}
        {hint ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 'auto',
              display: { xs: 'none', md: 'block' },
              fontSize: '0.8125rem'
            }}
          >
            {hint}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  )
}

export type PlayerSeasonSummaryProps = {
  /** Menos copy y toolbar compacto en mobile (p. ej. embebido en Mi cuenta). */
  compact?: boolean
}

export default function PlayerSeasonSummary({
  compact = false
}: PlayerSeasonSummaryProps) {
  const router = useRouter()
  const [period, setPeriod] = useState<SeasonPeriod>('month')
  const [customOpen, setCustomOpen] = useState(false)
  const [weekAnchor] = useState(() => new Date())

  const { data, isPending, isError, error, refetch, isFetching } =
    useMySeasonSummary(period)

  const kpis = data?.kpis
  const recentRounds = data?.recentRounds ?? []
  const topDecks = data?.topDecks ?? []

  return (
    <Stack spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
      {compact ? (
        <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ fontWeight: 800, letterSpacing: '0.08em' }}
            >
              Tu actividad
            </Typography>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 900,
                letterSpacing: '-0.03em',
                mt: 0.25,
                fontSize: '1.35rem',
                textWrap: 'balance'
              }}
            >
              Resumen de temporada
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SeasonPeriodFilter value={period} onChange={setPeriod} compact />
            </Box>
            <IconButton
              color="primary"
              onClick={() => setCustomOpen(true)}
              aria-label="Reportar torneo"
              sx={t => ({
                flexShrink: 0,
                width: 44,
                height: 44,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: `0 4px 14px ${alpha(t.palette.primary.main, 0.35)}`,
                '&:hover': {
                  bgcolor: 'primary.dark'
                },
                '&:active': {
                  transform: 'translateY(1px) scale(0.98)'
                }
              })}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        sx={{ display: compact ? { xs: 'none', sm: 'flex' } : 'flex' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ fontWeight: 800, letterSpacing: '0.08em' }}
          >
            Tu actividad
          </Typography>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 900,
              letterSpacing: '-0.03em',
              mt: 0.25,
              fontSize: { xs: '1.35rem', sm: '2.125rem' },
              textWrap: 'balance'
            }}
          >
            Resumen de temporada
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              maxWidth: 560,
              lineHeight: 1.6,
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Mesas reportadas, win rate y mazos más usados en el periodo
            seleccionado.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCustomOpen(true)}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            textTransform: 'none',
            fontWeight: 800,
            px: 2.5,
            py: 1.1,
            flexShrink: 0,
            display: { xs: compact ? 'none' : 'inline-flex', sm: 'inline-flex' }
          }}
        >
          Reportar torneo
        </Button>
      </Stack>

      <Box sx={{ display: compact ? { xs: 'none', sm: 'block' } : 'block' }}>
        <SeasonPeriodFilter value={period} onChange={setPeriod} compact />
      </Box>

      {isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={36} aria-label="Cargando resumen" />
        </Box>
      ) : isError ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Reintentar
            </Button>
          }
        >
          {error instanceof Error
            ? error.message
            : 'No se pudo cargar el resumen'}
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))'
              }
            }}
          >
            <KpiCard
              label="Mesas jugadas"
              shortLabel="Mesas"
              value={String(kpis?.totalRounds ?? 0)}
              trend={formatTrendPct(
                kpis?.trends?.roundsDeltaPct ?? null,
                period
              )}
              hint={
                (kpis?.totalRounds ?? 0) > 0
                  ? SEASON_PERIOD_LABELS[period]
                  : 'Reporta rondas en un torneo'
              }
              icon={<SportsEsportsIcon fontSize="small" />}
            />
            <KpiCard
              label="Win rate global"
              shortLabel="Win rate"
              value={
                kpis?.globalWinRate != null
                  ? `${Math.round(kpis.globalWinRate)}%`
                  : '—'
              }
              trend={formatTrendWinRate(
                kpis?.trends?.winRateDeltaPts ?? null,
                period
              )}
              hint={
                kpis?.globalWinRate != null
                  ? 'Victorias sobre mesas con resultado'
                  : 'Sin mesas decisivas aún'
              }
              icon={<TrendingUpIcon fontSize="small" />}
              progress={kpis?.globalWinRate ?? null}
            />
            <KpiCard
              label="Mazo principal"
              shortLabel="Mazo top"
              value={kpis?.principalDeck?.label ?? '—'}
              valueVariant="title"
              hint={
                kpis?.principalDeck
                  ? `${kpis.principalDeck.roundsPlayed} mesa${
                      kpis.principalDeck.roundsPlayed === 1 ? '' : 's'
                    }${
                      kpis.principalDeck.decklistName
                        ? ' · listado guardado'
                        : ''
                    }`
                  : 'Elige Pokémon o vincula un listado'
              }
              icon={<BarChartIcon fontSize="small" />}
            />
            <KpiCard
              label="Torneos con reporte"
              shortLabel="Torneos"
              value={String(kpis?.tournamentsWithReport ?? 0)}
              hint="Con al menos una mesa reportada"
              icon={<EmojiEventsIcon fontSize="small" />}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', lg: '1.45fr 1fr' },
              alignItems: 'start'
            }}
          >
            <Paper
              variant="outlined"
              sx={t => ({
                borderRadius: 2,
                overflow: 'hidden',
                borderColor: alpha(t.palette.text.primary, 0.1)
              })}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 1.25, sm: 1.75 },
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography
                  variant="h6"
                  component="h3"
                  fontWeight={800}
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  Últimas partidas
                </Typography>
                <Button
                  component={Link}
                  href={tuActividadPartidasHref(period)}
                  size="small"
                  endIcon={
                    <ChevronRightIcon
                      sx={{ display: { xs: 'none', sm: 'block' } }}
                    />
                  }
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    minWidth: 0,
                    px: { xs: 0.75, sm: 1.5 }
                  }}
                >
                  Ver todas
                </Button>
              </Stack>

              {recentRounds.length === 0 ? (
                <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, display: { xs: 'none', sm: 'block' } }}
                  >
                    No hay mesas reportadas en este periodo. Abre un torneo y
                    registra tus rondas en la bitácora.
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1.5, display: { xs: 'block', sm: 'none' } }}
                  >
                    Sin mesas en este periodo.
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
                <SeasonRoundsTable rounds={recentRounds} />
              )}
            </Paper>

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
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 1.25, sm: 1.75 },
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography
                  variant="h6"
                  component="h3"
                  fontWeight={800}
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  Top mazos
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25, display: { xs: 'none', sm: 'block' } }}
                >
                  Mejor win rate en {SEASON_PERIOD_LABELS[period].toLowerCase()}
                </Typography>
              </Box>

              {topDecks.length === 0 ? (
                <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: { xs: 'none', sm: 'block' } }}
                  >
                    Vincula un listado o elige Pokémon en un torneo y reporta
                    rondas para ver estadísticas por mazo.
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: { xs: 'block', sm: 'none' } }}
                  >
                    Reporta rondas para ver stats por mazo.
                  </Typography>
                </Box>
              ) : (
                <Stack
                  spacing={0}
                  divider={
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />
                  }
                >
                  {topDecks.map(row => (
                    <Box
                      key={row.myDeckKey}
                      component={Link}
                      href={dashboardStatsHref({
                        deckKey: row.myDeckKey,
                        fromTuActividad: true
                      })}
                      sx={t => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.75,
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: alpha(t.palette.primary.main, 0.05)
                        }
                      })}
                    >
                      <DecklistSpritePair slugs={row.myDeckSlugs} size={36} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={800} noWrap>
                          {row.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.roundsPlayed} mesa
                          {row.roundsPlayed === 1 ? '' : 's'}
                          {row.listLabel ? (
                            <Box
                              component="span"
                              sx={{ display: { xs: 'none', sm: 'inline' } }}
                            >
                              {` · ${row.listLabel}`}
                            </Box>
                          ) : null}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={row.winRate ?? 0}
                          sx={{
                            mt: 1,
                            height: 5,
                            borderRadius: 999,
                            bgcolor: t => alpha(t.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': { borderRadius: 999 }
                          }}
                        />
                      </Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={900}
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0
                        }}
                      >
                        {row.winRate != null
                          ? `${Math.round(row.winRate)}%`
                          : '—'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}

              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Button
                  component={Link}
                  href={dashboardStatsHref({ fromTuActividad: true })}
                  variant="outlined"
                  fullWidth
                  endIcon={
                    <ChevronRightIcon
                      sx={{ display: { xs: 'none', sm: 'block' } }}
                    />
                  }
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  <Box
                    component="span"
                    sx={{ display: { xs: 'none', sm: 'inline' } }}
                  >
                    Ver estadísticas completas
                  </Box>
                  <Box
                    component="span"
                    sx={{ display: { xs: 'inline', sm: 'none' } }}
                  >
                    Estadísticas
                  </Box>
                </Button>
              </Box>
            </Paper>
          </Box>
        </>
      )}

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
