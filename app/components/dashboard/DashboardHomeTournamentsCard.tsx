'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ChevronRight from '@mui/icons-material/ChevronRight'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useMyHomeTournaments } from '@/hooks/useWeeklyEvents'
import type { MyHomeTournamentItem } from '@/lib/my-tournament-week-types'
import type { WeeklyEventState } from '@/models/WeeklyEvent'

type HomeTournamentTab = 'upcoming' | 'finished'

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

function stateShortLabel(
  s: WeeklyEventState,
  kind: MyHomeTournamentItem['registrationKind']
): string {
  if (kind === 'finished') return 'Finalizado'
  if (s === 'running') return 'En curso'
  return 'Programado'
}

function stateMetaColor(
  s: WeeklyEventState,
  kind: MyHomeTournamentItem['registrationKind']
): string {
  if (kind === 'finished') return 'success.main'
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

function wltCompact(t: MyHomeTournamentItem): string | null {
  const r = t.myMatchRecord
  if (!r) return null
  const sum = r.wins + r.losses + r.ties
  if (sum === 0) return null
  return `${r.wins}-${r.losses}-${r.ties}`
}

function TabCount({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null
  return (
    <Box
      component="span"
      sx={{
        ml: 0.5,
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: 9,
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: '0.6875rem',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        bgcolor: t =>
          active
            ? alpha(t.palette.primary.main, 0.18)
            : alpha(t.palette.text.primary, 0.08),
        color: active ? 'primary.dark' : 'text.secondary'
      }}
    >
      {count}
    </Box>
  )
}

function TournamentRow({
  t,
  storeLabel,
  showStore
}: {
  t: MyHomeTournamentItem
  storeLabel: string
  showStore: boolean
}) {
  const startsAtLabel = formatEventStartsAt(t.startsAt)
  const isFinished = t.registrationKind === 'finished'
  const metaState = stateShortLabel(t.state, t.registrationKind)
  const wlt = wltCompact(t)
  const href = `/dashboard/torneos-semana/${t.eventId}`

  return (
    <Box
      component="li"
      sx={{
        '&:hover': {
          bgcolor: theme => alpha(theme.palette.primary.main, 0.04)
        },
        '&:active': {
          bgcolor: theme => alpha(theme.palette.primary.main, 0.07)
        }
      }}
    >
      <Box
        component={Link}
        href={href}
        sx={{
          display: 'grid',
          gridTemplateColumns: isFinished
            ? {
                xs: 'minmax(4.5rem, 28%) minmax(0, 1fr) minmax(5.5rem, 34%)',
                sm: 'minmax(5rem, 24%) minmax(0, 1fr) minmax(7.5rem, 30%)'
              }
            : {
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

        {!isFinished ? (
          <Typography
            variant="caption"
            component="span"
            sx={{
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              color: stateMetaColor(t.state, t.registrationKind),
              px: 0.5,
              flexShrink: 0
            }}
          >
            {metaState}
          </Typography>
        ) : null}

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
          title={wlt ? `Récord ${wlt} · ${startsAtLabel}` : startsAtLabel}
        >
          {wlt ?? startsAtLabel}
        </Typography>
      </Box>
    </Box>
  )
}

export default function DashboardHomeTournamentsCard() {
  const { data, isPending, isError, error, refetch } = useMyHomeTournaments()
  const tournaments = useMemo(
    () => data?.tournaments ?? [],
    [data?.tournaments]
  )
  const finishedTournaments = useMemo(
    () => data?.finishedTournaments ?? [],
    [data?.finishedTournaments]
  )
  const flatRows = useMemo(() => buildFlatRows(tournaments), [tournaments])
  const finishedRows = useMemo(
    () => buildFlatRows(finishedTournaments),
    [finishedTournaments]
  )
  const hiddenCount = data?.hiddenCount ?? 0
  const preRegistered = data?.preRegisteredCount ?? 0
  const finishedTotal = data?.finishedCount ?? finishedTournaments.length

  const hasUpcoming = tournaments.length > 0
  const hasFinished = finishedTournaments.length > 0
  const hasAny = hasUpcoming || hasFinished

  const autoTab = useMemo((): HomeTournamentTab => {
    if (!hasUpcoming && hasFinished) return 'finished'
    return 'upcoming'
  }, [hasUpcoming, hasFinished])

  const [userTab, setUserTab] = useState<HomeTournamentTab | null>(null)
  const tab = userTab ?? autoTab
  const showTabs = hasUpcoming && hasFinished
  const effectiveTab: HomeTournamentTab = showTabs
    ? tab
    : hasUpcoming
      ? 'upcoming'
      : 'finished'

  const upcomingStoreCount = useMemo(
    () => new Set(flatRows.map(r => r.storeKey)).size,
    [flatRows]
  )
  const finishedStoreCount = useMemo(
    () => new Set(finishedRows.map(r => r.storeKey)).size,
    [finishedRows]
  )

  if (isPending) {
    return (
      <Box
        component="section"
        aria-label="Cargando torneos"
        sx={{
          height: '100%',
          borderRadius: 2.5,
          py: 2.5,
          px: 2,
          border: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.08),
          bgcolor: 'background.paper',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
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
          height: '100%',
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

  const headerSubtitle =
    effectiveTab === 'upcoming'
      ? `${preRegistered === 1 ? '1 preinscrito' : `${preRegistered} preinscritos`}${
          upcomingStoreCount > 1
            ? ` · ${upcomingStoreCount} tiendas`
            : flatRows[0]
              ? ` · ${flatRows[0].storeLabel}`
              : ''
        }`
      : `${finishedTournaments.length === 1 ? '1 finalizado' : `${finishedTournaments.length} finalizados`}${
          finishedStoreCount > 1
            ? ` · ${finishedStoreCount} tiendas`
            : finishedRows[0]
              ? ` · ${finishedRows[0].storeLabel}`
              : ''
        }`

  const singleFinished =
    finishedTournaments.length === 1 ? finishedTournaments[0] : null
  const reportHref = singleFinished
    ? `/dashboard/torneos-semana/${singleFinished.eventId}`
    : '/dashboard/torneos-semana'
  const finishedHiddenCount = Math.max(
    0,
    finishedTotal - finishedTournaments.length
  )

  return (
    <Box
      component="section"
      aria-labelledby="dashboard-home-tournaments-heading"
      data-tour="dashboard-home-tournaments"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
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
          pb: showTabs ? 0.5 : 0.75,
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
            {showTabs
              ? 'Mis torneos'
              : effectiveTab === 'upcoming'
                ? 'Próximos torneos'
                : 'Torneo finalizado'}
          </Typography>
          {headerSubtitle ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.15, fontWeight: 500 }}
            >
              {headerSubtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>

      {showTabs ? (
        <Tabs
          value={tab}
          onChange={(_e, v) => setUserTab(v as HomeTournamentTab)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            px: { xs: 1, sm: 1.5 },
            borderBottom: '1px solid',
            borderColor: t => alpha(t.palette.divider, 0.9),
            '& .MuiTabs-indicator': {
              height: 2.5,
              borderRadius: '2px 2px 0 0'
            },
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.75,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '-0.01em',
              '&.Mui-selected': { fontWeight: 800 }
            }
          }}
        >
          <Tab
            value="upcoming"
            label={
              <Stack direction="row" alignItems="center" component="span">
                Próximos
                <TabCount count={preRegistered} active={tab === 'upcoming'} />
              </Stack>
            }
          />
          <Tab
            value="finished"
            label={
              <Stack direction="row" alignItems="center" component="span">
                Finalizados
                <TabCount
                  count={finishedTournaments.length}
                  active={tab === 'finished'}
                />
              </Stack>
            }
          />
        </Tabs>
      ) : (
        <Box
          sx={{
            borderBottom: '1px solid',
            borderColor: t => alpha(t.palette.divider, 0.9)
          }}
        />
      )}

      {effectiveTab === 'upcoming' ? (
        hasUpcoming ? (
          <Box
            component="ul"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              flex: 1,
              '& > li:not(:last-child)': {
                borderBottom: '1px solid',
                borderColor: t => alpha(t.palette.divider, 0.85)
              }
            }}
          >
            {flatRows.map(row => (
              <TournamentRow
                key={row.tournament.eventId}
                t={row.tournament}
                storeLabel={row.storeLabel}
                showStore={row.showStore}
              />
            ))}
          </Box>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 2, py: 2.5, lineHeight: 1.55, flex: 1 }}
          >
            No tienes torneos preinscritos activos.
          </Typography>
        )
      ) : hasFinished ? (
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            flex: 1,
            '& > li:not(:last-child)': {
              borderBottom: '1px solid',
              borderColor: t => alpha(t.palette.divider, 0.85)
            }
          }}
        >
          {finishedRows.map(row => (
            <TournamentRow
              key={row.tournament.eventId}
              t={row.tournament}
              storeLabel={row.storeLabel}
              showStore={row.showStore}
            />
          ))}
        </Box>
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 2.5, lineHeight: 1.55, flex: 1 }}
        >
          No hay torneos finalizados recientes.
        </Typography>
      )}

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          mt: 'auto',
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderTop: '1px solid',
          borderColor: t => alpha(t.palette.divider, 0.85),
          bgcolor: t => alpha(t.palette.primary.main, 0.04)
        }}
      >
        {effectiveTab === 'upcoming' && hiddenCount > 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            +{hiddenCount} más
          </Typography>
        ) : effectiveTab === 'finished' && finishedHiddenCount > 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            +{finishedHiddenCount} más
          </Typography>
        ) : (
          <Box />
        )}
        {effectiveTab === 'finished' && singleFinished ? (
          <Button
            component={Link}
            href={reportHref}
            size="small"
            variant="contained"
            color="primary"
            endIcon={<ChevronRight sx={{ fontSize: 18 }} />}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              minWidth: 0,
              py: 0.5,
              ml: 'auto',
              boxShadow: 'none',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:active': { transform: 'scale(0.98)' }
            }}
          >
            Reportar rondas
          </Button>
        ) : (
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
              ml: 'auto',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:active': { transform: 'scale(0.98)' }
            }}
          >
            Ver todos
          </Button>
        )}
      </Stack>
    </Box>
  )
}
