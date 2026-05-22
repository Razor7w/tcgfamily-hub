'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import ChevronRight from '@mui/icons-material/ChevronRight'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useMyHomeTournaments } from '@/hooks/useWeeklyEvents'
import type { MyHomeTournamentItem } from '@/lib/my-tournament-week-types'
import type { WeeklyEventState } from '@/models/WeeklyEvent'

type FlatRow = {
  tournament: MyHomeTournamentItem
  storeKey: string
  storeLabel: string
  showStore: boolean
}

function storeKeyFor(t: MyHomeTournamentItem): string {
  return t.storeName.trim().toLowerCase() || 'unknown'
}

function buildFlatRows(tournaments: MyHomeTournamentItem[]): FlatRow[] {
  const sorted = [...tournaments].sort((a, b) => {
    const storeCmp = a.storeName.localeCompare(b.storeName, 'es')
    if (storeCmp !== 0) return storeCmp
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  })

  let prevStore = ''
  const rows: FlatRow[] = []
  for (const tournament of sorted) {
    const storeKey = storeKeyFor(tournament)
    const storeLabel = tournament.storeName
    const showStore = storeKey !== prevStore
    prevStore = storeKey
    rows.push({ tournament, storeKey, storeLabel, showStore })
  }
  return rows
}

function stateShortLabel(s: WeeklyEventState): string {
  if (s === 'running') return 'En curso'
  return 'Programado'
}

function stateMetaColor(s: WeeklyEventState): string {
  if (s === 'running') return 'warning.dark'
  return 'text.secondary'
}

function formatEventStartsAt(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function subtitleForCount(count: number): string {
  return count === 1 ? '1 preinscrito' : `${count} preinscritos`
}

export default function DashboardHomeTournamentsCard() {
  const { data, isPending, isError, error, refetch } = useMyHomeTournaments()
  const tournaments = useMemo(
    () => data?.tournaments ?? [],
    [data?.tournaments]
  )
  const flatRows = useMemo(() => buildFlatRows(tournaments), [tournaments])
  const hiddenCount = data?.hiddenCount ?? 0
  const storeCount = useMemo(
    () => new Set(flatRows.map(r => r.storeKey)).size,
    [flatRows]
  )

  const preRegistered = data?.preRegisteredCount ?? 0
  const hasAny = tournaments.length > 0

  if (isPending) {
    return (
      <Box
        component="section"
        aria-label="Cargando torneos"
        sx={{
          borderRadius: 2.5,
          py: 2.5,
          px: 2,
          border: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08),
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Box
        component="section"
        sx={{
          borderRadius: 2.5,
          p: 2,
          border: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08),
          bgcolor: 'background.paper'
        }}
      >
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {error instanceof Error
              ? error.message
              : 'No se pudieron cargar los torneos'}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => refetch()}>
            Reintentar
          </Button>
        </Stack>
      </Box>
    )
  }

  if (!hasAny) {
    return null
  }

  const subtitle = subtitleForCount(preRegistered)

  return (
    <Box
      component="section"
      aria-labelledby="dashboard-home-tournaments-heading"
      data-tour="dashboard-home-tournaments"
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: t => alpha(t.palette.primary.main, 0.22),
        bgcolor: 'background.paper',
        boxShadow: t =>
          t.palette.mode === 'dark'
            ? 'none'
            : `0 12px 28px -16px ${alpha(t.palette.primary.main, 0.16)}`
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1.25, sm: 1.5 },
          pb: 0.75,
          background: t =>
            `linear-gradient(90deg, ${alpha(
              t.palette.primary.main,
              t.palette.mode === 'dark' ? 0.1 : 0.07
            )} 0%, transparent 72%)`
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: t => alpha(t.palette.primary.main, 0.14),
            color: 'primary.main'
          }}
        >
          <EmojiEventsOutlined sx={{ fontSize: 20 }} aria-hidden />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            id="dashboard-home-tournaments-heading"
            variant="subtitle2"
            component="h2"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Próximos torneos
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.15, fontWeight: 500 }}
          >
            {subtitle}
            {storeCount > 1
              ? ` · ${storeCount} tiendas`
              : flatRows[0]
                ? ` · ${flatRows[0].storeLabel}`
                : ''}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: t => alpha(t.palette.divider, 0.9)
        }}
      />

      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          '& > li:not(:last-child)': {
            borderBottom: '1px solid',
            borderColor: t => alpha(t.palette.divider, 0.85)
          }
        }}
      >
        {flatRows.map(({ tournament: t, storeLabel, showStore }) => {
          const startsAtLabel = formatEventStartsAt(t.startsAt)
          const metaState = stateShortLabel(t.state)
          const href = `/dashboard/torneos-semana/${t.eventId}`

          return (
            <Box
              component="li"
              key={t.eventId}
              sx={{
                '&:hover': {
                  bgcolor: t => alpha(t.palette.primary.main, 0.04)
                },
                '&:active': {
                  bgcolor: t => alpha(t.palette.primary.main, 0.07)
                }
              }}
            >
              <Box
                component={Link}
                href={href}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(4.5rem, 26%) minmax(0, 1fr) auto minmax(5.5rem, 34%)',
                    sm: 'minmax(5rem, 22%) minmax(0, 1fr) auto minmax(7.5rem, 30%)'
                  },
                  columnGap: { xs: 0.75, sm: 1 },
                  alignItems: 'center',
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.85, sm: 0.95 },
                  minHeight: 44,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: showStore ? 'text.primary' : 'text.disabled',
                    opacity: showStore ? 1 : 0
                  }}
                  aria-hidden={!showStore}
                >
                  {storeLabel}
                </Typography>

                <Typography
                  variant="body2"
                  component="span"
                  noWrap
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                    minWidth: 0
                  }}
                  title={t.title}
                >
                  {t.title}
                </Typography>

                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: stateMetaColor(t.state),
                    px: 0.5,
                    flexShrink: 0
                  }}
                  title="Preinscrito"
                >
                  {metaState}
                </Typography>

                <Typography
                  variant="caption"
                  component="span"
                  noWrap
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'text.secondary',
                    flexShrink: 0,
                    minWidth: 0,
                    textAlign: 'right',
                    fontSize: { xs: '0.65rem', sm: '0.7rem' }
                  }}
                  title={startsAtLabel}
                >
                  {startsAtLabel}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderTop: '1px solid',
          borderColor: t => alpha(t.palette.divider, 0.85),
          bgcolor: t => alpha(t.palette.primary.main, 0.04)
        }}
      >
        {hiddenCount > 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            +{hiddenCount} más
          </Typography>
        ) : (
          <Box />
        )}
        <Button
          component={Link}
          href="/dashboard/torneos-semana"
          size="small"
          color="primary"
          endIcon={<ChevronRight sx={{ fontSize: 18 }} />}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            minWidth: 0,
            py: 0.5,
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:active': { transform: 'scale(0.98)' }
          }}
        >
          Ver todos
        </Button>
      </Stack>
    </Box>
  )
}
