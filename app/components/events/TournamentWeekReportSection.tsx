'use client'

import { useMemo, useState } from 'react'
import EmojiEvents from '@mui/icons-material/EmojiEvents'
import FilterList from '@mui/icons-material/FilterList'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import ViewList from '@mui/icons-material/ViewList'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
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
import { alpha } from '@mui/material/styles'
import DeleteCustomTournamentButton from '@/components/events/DeleteCustomTournamentButton'
import {
  endOfWeekSunday,
  localDayKey,
  startOfWeekMonday
} from '@/components/events/weekUtils'
import { useMyTournamentsWeekReport } from '@/hooks/useWeeklyEvents'
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
  /** Abre el diálogo para registrar un torneo custom (se muestra en la pestaña correspondiente). */
  onOpenCreateCustomDialog?: () => void
}

/**
 * Resumen informativo de torneos en los que el usuario participa en la semana seleccionada.
 * Visible cuando el módulo «Mis torneos» está activo en el panel (inicio o página dedicada).
 */
export default function TournamentWeekReportSection({
  weekAnchor,
  onOpenCreateCustomDialog
}: TournamentWeekReportSectionProps) {
  const { data, isPending, isError, error, refetch } =
    useMyTournamentsWeekReport(weekAnchor)

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

  const [tab, setTab] = useState(0)
  const [unifiedMode, setUnifiedMode] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filterOrigin, setFilterOrigin] = useState<OriginFilter>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null)
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null)

  const [draftOrigin, setDraftOrigin] = useState<OriginFilter>('all')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')

  const effFrom = filterDateFrom ?? weekBounds.from
  const effTo = filterDateTo ?? weekBounds.to

  const unifiedSorted = useMemo(() => {
    return [...list].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
  }, [list])

  const filteredUnified = useMemo(() => {
    return filterUnifiedList(unifiedSorted, filterOrigin, effFrom, effTo)
  }, [unifiedSorted, filterOrigin, effFrom, effTo])

  const displayed = unifiedMode
    ? filteredUnified
    : tab === 0
      ? officialOnly
      : customOnly

  const tabLabel = (base: string, count: number, loaded: boolean) => {
    if (!loaded || count === 0) return base
    return `${base} (${count})`
  }

  const openFiltersModal = () => {
    setDraftOrigin(filterOrigin)
    setDraftFrom(filterDateFrom ?? weekBounds.from)
    setDraftTo(filterDateTo ?? weekBounds.to)
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

  const showReportar = onOpenCreateCustomDialog && (unifiedMode || tab === 1)

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <CardHeader
        avatar={<EmojiEvents color="primary" />}
        title="Tu semana en torneos"
        subheader={
          unifiedMode
            ? 'Lista unificada de la semana (oficiales y custom). Usa filtros para acotar por tipo o fecha.'
            : 'Calendario de la tienda frente a torneos que registras tú. Elige una pestaña para ver cada lista.'
        }
        slotProps={{ title: { variant: 'h6' } }}
        sx={{
          pb: 1,
          '& .MuiCardHeader-subheader': { lineHeight: 1.45 }
        }}
        action={
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            justifyContent="flex-end"
            sx={{ maxWidth: { xs: '100%', sm: 360 } }}
          >
            {!unifiedMode ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ViewList />}
                onClick={() => setUnifiedMode(true)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Ver todo
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterList />}
                  onClick={openFiltersModal}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Filtros
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setUnifiedMode(false)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Vista por pestañas
                </Button>
              </>
            )}
          </Stack>
        }
      />

      {!unifiedMode ? (
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
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem'
              }
            }}
          >
            <Tab
              icon={<StorefrontOutlinedIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={tabLabel('Oficiales', officialOnly.length, !isPending)}
              id="tournaments-tab-official"
              aria-controls="tournaments-panel"
            />
            <Tab
              icon={<TuneOutlinedIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
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
            px: 2,
            pt: 2,
            pb: 0,
            display: 'flex',
            justifyContent: { xs: 'stretch', sm: 'flex-end' }
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={onOpenCreateCustomDialog}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              py: 1.1,
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
          unifiedMode
            ? 'tournaments-unified'
            : tab === 0
              ? 'tournaments-tab-official'
              : 'tournaments-tab-custom'
        }
        sx={{ pt: 2 }}
      >
        {unifiedMode ? (
          <Typography
            id="tournaments-unified"
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
            Lista unificada de torneos de la semana
          </Typography>
        ) : null}

        {isPending ? (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
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
            {unifiedMode ? (
              list.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  No tienes torneos en esta semana (ni del calendario de la
                  tienda ni custom). Preinscríbete en eventos o reporta un
                  torneo personal.
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
              return (
                <Stack
                  key={t.eventId}
                  spacing={0.75}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover'
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.25}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ minWidth: 0, flex: 1 }}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ minWidth: 0 }}
                      >
                        {t.title}
                      </Typography>
                      {unifiedMode ? (
                        <Chip
                          size="small"
                          label={origin === 'custom' ? 'Custom' : 'Oficial'}
                          variant="outlined"
                          sx={{ flexShrink: 0, fontWeight: 600 }}
                        />
                      ) : null}
                    </Stack>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                        width: { xs: '100%', sm: 'auto' }
                      }}
                    >
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
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          flexShrink: 0,
                          ml: { xs: 'auto', sm: 0 }
                        }}
                      >
                        <Button
                          component={Link}
                          href={`/dashboard/torneos-semana/${t.eventId}`}
                          variant="outlined"
                          size="small"
                          sx={{ flexShrink: 0 }}
                        >
                          Ver detalle
                        </Button>
                        {origin === 'custom' ? (
                          <DeleteCustomTournamentButton
                            eventId={t.eventId}
                            tournamentTitle={t.title}
                            size="small"
                            variant="text"
                            label="Eliminar"
                          />
                        ) : null}
                      </Stack>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatWhen(t.startsAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {placementSummary(t)}
                  </Typography>
                </Stack>
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
                Acota por día dentro de la semana seleccionada arriba (
                {weekBounds.from} — {weekBounds.to}).
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
                    min: weekBounds.from,
                    max: weekBounds.to
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
                    min: weekBounds.from,
                    max: weekBounds.to
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
              setDraftFrom(weekBounds.from)
              setDraftTo(weekBounds.to)
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
