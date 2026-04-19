'use client'

import { useMemo, useState } from 'react'
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import EmojiEvents from '@mui/icons-material/EmojiEvents'
import FilterList from '@mui/icons-material/FilterList'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import ViewList from '@mui/icons-material/ViewList'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Link from 'next/link'
import { alpha, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import DeleteCustomTournamentButton from '@/components/events/DeleteCustomTournamentButton'
import {
  endOfWeekSunday,
  localDayKey,
  startOfWeekMonday
} from '@/components/events/weekUtils'
import {
  useMyTournamentsAllReport,
  useMyTournamentsWeekReport
} from '@/hooks/useWeeklyEvents'
import type { MyTournamentWeekItem } from '@/lib/my-tournament-week-types'
import type { WeeklyEventState } from '@/models/WeeklyEvent'

function stateLabel(s: WeeklyEventState): string {
  if (s === 'schedule') return 'Programado'
  if (s === 'running') return 'En curso'
  return 'Finalizado'
}

function stateColor(
  s: WeeklyEventState
): 'default' | 'primary' | 'success' | 'warning' {
  if (s === 'schedule') return 'default'
  if (s === 'running') return 'warning'
  return 'success'
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function placementSummary(t: MyTournamentWeekItem): string {
  if (t.tournamentOrigin === 'custom') {
    const parts: string[] = []
    const r = t.myMatchRecord
    if (r && (r.wins > 0 || r.losses > 0 || r.ties > 0)) {
      parts.push(`Récord ${r.wins}-${r.losses}-${r.ties} (rondas reportadas)`)
    }
    if (t.placement) {
      if (t.placement.isDnf) {
        parts.push(`${t.placement.categoryLabel} · DNF`)
      } else if (t.placement.place != null && t.placement.place > 0) {
        parts.push(`${t.placement.categoryLabel} · ${t.placement.place}º lugar`)
      } else {
        parts.push(t.placement.categoryLabel)
      }
    }
    if (parts.length > 0) return parts.join(' · ')
    return 'Reporta tus rondas o indica tu posición al crear el torneo.'
  }
  if (t.state !== 'close') {
    if (t.state === 'running') {
      const r = t.myMatchRecord
      if (r && (r.wins > 0 || r.losses > 0 || r.ties > 0)) {
        return `Récord ${r.wins}-${r.losses}-${r.ties} (al publicar la tabla verás tu puesto)`
      }
      return 'Clasificación al cerrar el torneo'
    }
    return 'Aún no hay resultado final'
  }
  if (!t.placement) {
    return 'Tabla publicada; no figuras en posiciones o DNF'
  }
  if (t.placement.isDnf) {
    return `${t.placement.categoryLabel} · DNF`
  }
  if (t.placement.place != null && t.placement.place > 0) {
    return `${t.placement.categoryLabel} · ${t.placement.place}º lugar`
  }
  return t.placement.categoryLabel
}

function isOfficial(t: MyTournamentWeekItem) {
  return (t.tournamentOrigin ?? 'official') !== 'custom'
}

function isCustom(t: MyTournamentWeekItem) {
  return t.tournamentOrigin === 'custom'
}

type OriginFilter = 'all' | 'official' | 'custom'

function dayStartMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

function dayEndMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

function filterUnifiedList(
  items: MyTournamentWeekItem[],
  origin: OriginFilter,
  fromYmd: string,
  toYmd: string
): MyTournamentWeekItem[] {
  const fromMs = dayStartMs(fromYmd)
  const toMs = dayEndMs(toYmd)
  return items.filter(t => {
    if (origin === 'official' && !isOfficial(t)) return false
    if (origin === 'custom' && !isCustom(t)) return false
    const ts = new Date(t.startsAt).getTime()
    if (ts < fromMs || ts > toMs) return false
    return true
  })
}

type TournamentWeekReportSectionProps = {
  weekAnchor: Date
  /** Cuando es true, lista todos los torneos del usuario (sin filtro de semana). El padre suele ocultar el selector de semana. */
  allTimeMode?: boolean
  /** Activa o desactiva la vista «todos los torneos» (p. ej. desde «Ver todo» / «Vista por semana»). */
  onAllTimeModeChange?: (allTime: boolean) => void
  /** Abre el diálogo para registrar un torneo custom (se muestra en la pestaña correspondiente o en vista completa). */
  onOpenCreateCustomDialog?: () => void
}

/**
 * Resumen informativo de torneos en los que el usuario participa en la semana seleccionada.
 * Visible cuando el módulo «Mis torneos» está activo en el panel (inicio o página dedicada).
 */
export default function TournamentWeekReportSection({
  weekAnchor,
  allTimeMode = false,
  onAllTimeModeChange,
  onOpenCreateCustomDialog
}: TournamentWeekReportSectionProps) {
  const weekQuery = useMyTournamentsWeekReport(allTimeMode ? null : weekAnchor)
  const allQuery = useMyTournamentsAllReport(allTimeMode)

  const data = allTimeMode ? allQuery.data : weekQuery.data
  const isPending = allTimeMode ? allQuery.isPending : weekQuery.isPending
  const isError = allTimeMode ? allQuery.isError : weekQuery.isError
  const error = allTimeMode ? allQuery.error : weekQuery.error
  const refetch = () => (allTimeMode ? allQuery.refetch() : weekQuery.refetch())

  const list = useMemo(() => data?.tournaments ?? [], [data?.tournaments])
  const officialOnly = useMemo(() => list.filter(isOfficial), [list])
  const customOnly = useMemo(() => list.filter(isCustom), [list])

  const weekBounds = useMemo(() => {
    const mon = startOfWeekMonday(weekAnchor)
    const sun = endOfWeekSunday(weekAnchor)
    return {
      from: localDayKey(mon),
      to: localDayKey(sun)
    }
  }, [weekAnchor])

  const boundsForFilters = useMemo(() => {
    if (!allTimeMode) return weekBounds
    if (list.length === 0) {
      const d = new Date()
      const k = localDayKey(d)
      return { from: k, to: k }
    }
    let minMs = Infinity
    let maxMs = -Infinity
    for (const t of list) {
      const ms = new Date(t.startsAt).getTime()
      if (ms < minMs) minMs = ms
      if (ms > maxMs) maxMs = ms
    }
    return {
      from: localDayKey(new Date(minMs)),
      to: localDayKey(new Date(maxMs))
    }
  }, [allTimeMode, weekBounds, list])

  const [tab, setTab] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filterOrigin, setFilterOrigin] = useState<OriginFilter>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null)
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null)

  const [draftOrigin, setDraftOrigin] = useState<OriginFilter>('all')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')

  const effFrom = filterDateFrom ?? boundsForFilters.from
  const effTo = filterDateTo ?? boundsForFilters.to

  const allTimeSorted = useMemo(() => {
    return [...list].sort(
      (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
    )
  }, [list])

  const filteredAllTime = useMemo(() => {
    return filterUnifiedList(allTimeSorted, filterOrigin, effFrom, effTo)
  }, [allTimeSorted, filterOrigin, effFrom, effTo])

  const displayed = allTimeMode
    ? filteredAllTime
    : tab === 0
      ? officialOnly
      : customOnly

  const tabLabel = (base: string, count: number, loaded: boolean) => {
    if (!loaded || count === 0) return base
    return `${base} (${count})`
  }

  const openFiltersModal = () => {
    setDraftOrigin(filterOrigin)
    setDraftFrom(filterDateFrom ?? boundsForFilters.from)
    setDraftTo(filterDateTo ?? boundsForFilters.to)
    setFiltersOpen(true)
  }

  const applyFilters = () => {
    let from = draftFrom.trim()
    let to = draftTo.trim()
    if (from && to && dayStartMs(from) > dayEndMs(to)) {
      const swap = from
      from = to
      to = swap
    }
    setFilterOrigin(draftOrigin)
    setFilterDateFrom(from || null)
    setFilterDateTo(to || null)
    setFiltersOpen(false)
  }

  const resetAppliedFilters = () => {
    setFilterOrigin('all')
    setFilterDateFrom(null)
    setFilterDateTo(null)
  }

  const showReportar = onOpenCreateCustomDialog && (allTimeMode || tab === 1)

  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'))

  const cardTitle = allTimeMode ? 'Todos tus torneos' : 'Tu semana en torneos'
  const subheaderLong = allTimeMode
    ? 'Todos los torneos en los que participas (más recientes primero). Usa filtros para acotar por tipo o fecha.'
    : 'Calendario de la tienda frente a torneos que registras tú. Elige una pestaña para ver cada lista.'
  const subheaderShort = allTimeMode
    ? 'Oficiales y custom; más recientes primero. Puedes filtrar por tipo o fechas.'
    : 'Separa torneos del calendario de la tienda y los que registras tú.'

  const actionBtnSx = {
    textTransform: 'none' as const,
    fontWeight: 700 as const,
    minHeight: { xs: 44, sm: 36 },
    py: { xs: 1, sm: 0.5 },
    px: { xs: 1.5, sm: 1.25 },
    fontSize: { xs: '0.875rem', sm: '0.8125rem' }
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <Box
        sx={t => ({
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 2, sm: 2 },
          pb: { xs: 1.5, sm: 1 },
          borderBottom: allTimeMode ? `1px solid ${t.palette.divider}` : 'none',
          bgcolor: alpha(t.palette.primary.main, 0.03)
        })}
      >
        <Stack spacing={{ xs: 1.75, sm: 1.25 }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={{ xs: 1.5, lg: 2 }}
            alignItems={{ xs: 'stretch', lg: 'flex-start' }}
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="flex-start"
              sx={{ minWidth: 0, flex: { xs: 'none', lg: 1 } }}
            >
              <Box
                aria-hidden
                sx={t => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: { xs: 44, sm: 40 },
                  height: { xs: 44, sm: 40 },
                  borderRadius: 1.5,
                  bgcolor: alpha(t.palette.primary.main, 0.1),
                  color: 'primary.main'
                })}
              >
                <EmojiEvents sx={{ fontSize: { xs: 24, sm: 22 } }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1, pt: { xs: 0, sm: 0.25 } }}>
                <Typography
                  id="tournaments-card-title"
                  variant="h6"
                  component="h2"
                  fontWeight={700}
                  sx={{
                    lineHeight: 1.25,
                    wordBreak: 'break-word'
                  }}
                >
                  {cardTitle}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    lineHeight: 1.5,
                    display: { xs: 'none', sm: 'block' },
                    maxWidth: 'min(56ch, 100%)'
                  }}
                >
                  {subheaderLong}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    lineHeight: 1.5,
                    display: { xs: 'block', sm: 'none' },
                    maxWidth: '100%'
                  }}
                >
                  {subheaderShort}
                </Typography>
              </Box>
            </Stack>

            {onAllTimeModeChange ? (
              <Stack
                direction={{ xs: 'row', lg: 'row' }}
                spacing={1}
                useFlexGap
                sx={{
                  width: { xs: '100%', lg: 'auto' },
                  flexShrink: 0,
                  alignSelf: { xs: 'stretch', lg: 'flex-start' },
                  ...(allTimeMode
                    ? {
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr 1fr',
                          sm: '1fr 1fr',
                          lg: 'auto auto'
                        },
                        gap: 1,
                        alignItems: 'stretch'
                      }
                    : {})
                }}
              >
                {!allTimeMode ? (
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth={isNarrow}
                    startIcon={<ViewList />}
                    onClick={() => onAllTimeModeChange(true)}
                    sx={actionBtnSx}
                  >
                    Ver todo
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth={false}
                      startIcon={<FilterList />}
                      onClick={openFiltersModal}
                      sx={actionBtnSx}
                    >
                      Filtros
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      fullWidth={false}
                      onClick={() => onAllTimeModeChange(false)}
                      sx={{
                        ...actionBtnSx,
                        fontWeight: 600,
                        px: { xs: 1, sm: 1.25 }
                      }}
                    >
                      Vista por semana
                    </Button>
                  </>
                )}
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      {!allTimeMode ? (
        <Box
          sx={t => ({
            px: { xs: 1, sm: 2 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(t.palette.primary.main, 0.03)
          })}
        >
          <Tabs
            value={tab}
            onChange={(_, v: number) => setTab(v)}
            variant="fullWidth"
            aria-label="Tipo de torneo"
            sx={{
              minHeight: { xs: 56, sm: 48 },
              '& .MuiTab-root': {
                minHeight: { xs: 56, sm: 48 },
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.8125rem', sm: '0.9375rem' },
                lineHeight: 1.2,
                px: { xs: 0.5, sm: 1 }
              }
            }}
          >
            <Tab
              icon={
                <StorefrontOutlinedIcon sx={{ fontSize: isNarrow ? 18 : 20 }} />
              }
              iconPosition={isNarrow ? 'top' : 'start'}
              label={tabLabel('Oficiales', officialOnly.length, !isPending)}
              id="tournaments-tab-official"
              aria-controls="tournaments-panel"
            />
            <Tab
              icon={<TuneOutlinedIcon sx={{ fontSize: isNarrow ? 18 : 20 }} />}
              iconPosition={isNarrow ? 'top' : 'start'}
              label={tabLabel('Custom', customOnly.length, !isPending)}
              id="tournaments-tab-custom"
              aria-controls="tournaments-panel"
            />
          </Tabs>
        </Box>
      ) : null}

      {showReportar ? (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            pt: { xs: 1.75, sm: 2 },
            pb: { xs: 0.5, sm: 0 },
            display: 'flex',
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            position: 'relative',
            zIndex: 1
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={onOpenCreateCustomDialog}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              py: { xs: 1.25, sm: 1.1 },
              minHeight: { xs: 48, sm: 40 },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Reportar torneo
          </Button>
        </Box>
      ) : null}

      <CardContent
        id="tournaments-panel"
        role="tabpanel"
        aria-labelledby={
          allTimeMode
            ? 'tournaments-all-time'
            : tab === 0
              ? 'tournaments-tab-official'
              : 'tournaments-tab-custom'
        }
        sx={{
          pt: { xs: 1.75, sm: 2 },
          px: { xs: 1.5, sm: 2 },
          pb: { xs: 2.5, sm: 2 }
        }}
      >
        {allTimeMode ? (
          <Typography
            id="tournaments-all-time"
            component="h3"
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0
            }}
          >
            Lista completa de torneos
          </Typography>
        ) : null}

        {isPending ? (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={112} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={112} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          >
            {error instanceof Error
              ? error.message
              : 'No se pudo cargar el reporte'}
          </Alert>
        ) : displayed.length === 0 ? (
          <Stack spacing={1.5} sx={{ py: 1 }}>
            {allTimeMode ? (
              list.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  Aún no tienes torneos en los que figuras como participante.
                  Preinscríbete en eventos de la tienda o reporta un torneo
                  personal.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    Ningún torneo coincide con los filtros (tipo o fechas).
                    Ajusta los filtros o restablécelos.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={resetAppliedFilters}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                  >
                    Restablecer filtros
                  </Button>
                </Stack>
              )
            ) : tab === 0 ? (
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  No tienes torneos del calendario de la tienda en esta semana.
                  Cuando te preinscribas en un evento, aparecerá aquí con estado
                  y posición al cerrarse.
                </Typography>
                <Button
                  component={Link}
                  href="/dashboard/eventos"
                  variant="text"
                  size="small"
                  sx={{
                    alignSelf: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Ir a eventos de la semana
                </Button>
              </>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.6 }}
              >
                {onOpenCreateCustomDialog
                  ? 'Aún no registraste torneos personalizados en esta semana. Usa el botón de arriba para crear uno y llevar tu bitácora de rondas aunque no esté en el calendario de la tienda.'
                  : 'Aún no registraste torneos personalizados en esta semana. Sirven para llevar tu bitácora de rondas aunque el torneo no esté en el calendario de la tienda.'}
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            {displayed.map(t => {
              const origin = t.tournamentOrigin ?? 'official'
              const btnSize = isNarrow ? 'medium' : 'small'
              return (
                <Box
                  key={t.eventId}
                  sx={theme => ({
                    p: { xs: 1.75, sm: 2 },
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: alpha(theme.palette.background.paper, 0.72),
                    transition: theme.transitions.create(
                      ['border-color', 'box-shadow'],
                      { duration: theme.transitions.duration.shorter }
                    ),
                    '@media (hover: hover)': {
                      '&:hover': {
                        borderColor: alpha(theme.palette.primary.main, 0.28),
                        boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.06)}`
                      }
                    }
                  })}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 2, sm: 2 }}
                    alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                    justifyContent="space-between"
                  >
                    <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        alignItems="center"
                        columnGap={1}
                        rowGap={0.75}
                      >
                        <Typography
                          variant="subtitle1"
                          component="h3"
                          fontWeight={700}
                          sx={{
                            minWidth: 0,
                            lineHeight: 1.3,
                            wordBreak: 'break-word'
                          }}
                        >
                          {t.title}
                        </Typography>
                        {allTimeMode ? (
                          <Chip
                            size="small"
                            label={origin === 'custom' ? 'Custom' : 'Oficial'}
                            variant="outlined"
                            sx={{ flexShrink: 0, fontWeight: 600 }}
                          />
                        ) : null}
                        {origin !== 'custom' ? (
                          <Chip
                            size="small"
                            label={stateLabel(t.state)}
                            color={stateColor(t.state)}
                            variant="outlined"
                            sx={theme => ({
                              flexShrink: 0,
                              height: 26,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              borderWidth: 1,
                              bgcolor:
                                t.state === 'close'
                                  ? alpha(theme.palette.success.main, 0.06)
                                  : undefined,
                              borderColor:
                                t.state === 'close'
                                  ? alpha(theme.palette.success.main, 0.35)
                                  : undefined,
                              color:
                                t.state === 'close'
                                  ? theme.palette.success.dark
                                  : undefined,
                              maxWidth: '100%',
                              '& .MuiChip-label': { px: 1, py: 0 }
                            })}
                          />
                        ) : null}
                      </Stack>

                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.75}
                        sx={{ color: 'text.secondary' }}
                      >
                        <CalendarTodayOutlined
                          sx={{
                            fontSize: 17,
                            opacity: 0.85,
                            flexShrink: 0
                          }}
                          aria-hidden
                        />
                        <Typography variant="body2" component="p" sx={{ m: 0 }}>
                          {formatWhen(t.startsAt)}
                        </Typography>
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.55, m: 0 }}
                      >
                        {placementSummary(t)}
                      </Typography>
                    </Stack>

                    <Box
                      sx={{
                        display: { xs: 'grid', sm: 'flex' },
                        flexDirection: { sm: 'column' },
                        gap: 1,
                        width: { xs: '100%', sm: 'auto' },
                        flexShrink: 0,
                        alignSelf: { xs: 'stretch', sm: 'flex-start' },
                        minWidth: { sm: 148 },
                        gridTemplateColumns:
                          origin === 'custom'
                            ? { xs: 'repeat(2, minmax(0, 1fr))', sm: 'none' }
                            : { xs: 'minmax(0, 1fr)', sm: 'none' }
                      }}
                    >
                      <Button
                        component={Link}
                        href={`/dashboard/torneos-semana/${t.eventId}`}
                        variant="outlined"
                        color="primary"
                        size={btnSize}
                        fullWidth
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700
                        }}
                      >
                        Ver detalle
                      </Button>
                      {origin === 'custom' ? (
                        <Box sx={{ minWidth: 0, width: '100%' }}>
                          <DeleteCustomTournamentButton
                            eventId={t.eventId}
                            tournamentTitle={t.title}
                            size={btnSize}
                            variant="outlined"
                            label="Eliminar"
                            fullWidth
                          />
                        </Box>
                      ) : null}
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )}
      </CardContent>

      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="tournament-filters-title"
      >
        <DialogTitle id="tournament-filters-title">Filtros</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <FormControl>
              <FormLabel id="filter-origin-label">Origen</FormLabel>
              <RadioGroup
                aria-labelledby="filter-origin-label"
                value={draftOrigin}
                onChange={e => setDraftOrigin(e.target.value as OriginFilter)}
              >
                <FormControlLabel
                  value="all"
                  control={<Radio />}
                  label="Todos"
                />
                <FormControlLabel
                  value="official"
                  control={<Radio />}
                  label="Solo oficiales (calendario de la tienda)"
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio />}
                  label="Solo custom"
                />
              </RadioGroup>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Fecha de inicio del torneo
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mb: 1.5 }}
              >
                Acota por día entre {boundsForFilters.from} y{' '}
                {boundsForFilters.to}
                {allTimeMode
                  ? ' (rango de los torneos cargados en esta vista).'
                  : ' (semana seleccionada).'}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                useFlexGap
              >
                <TextField
                  label="Desde"
                  type="date"
                  size="small"
                  fullWidth
                  value={draftFrom}
                  onChange={e => setDraftFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: boundsForFilters.from,
                    max: boundsForFilters.to
                  }}
                />
                <TextField
                  label="Hasta"
                  type="date"
                  size="small"
                  fullWidth
                  value={draftTo}
                  onChange={e => setDraftTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: boundsForFilters.from,
                    max: boundsForFilters.to
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button
            onClick={() => {
              setDraftOrigin('all')
              setDraftFrom(boundsForFilters.from)
              setDraftTo(boundsForFilters.to)
            }}
            sx={{ textTransform: 'none' }}
          >
            Restablecer en formulario
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => setFiltersOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={applyFilters}
            sx={{ textTransform: 'none' }}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
