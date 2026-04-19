'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import { alpha, type Theme } from '@mui/material/styles'
import {
  ArrowBack,
  Close,
  ContentPaste,
  Delete,
  Edit,
  EventAvailable,
  FilterList
} from '@mui/icons-material'
import Link from 'next/link'
import {
  AdminWeeklyEvent,
  type WeeklyEventState,
  useAdminEvents,
  useAdminLeagues,
  useCreateAdminEvent,
  useDeleteAdminEvent,
  useUpdateAdminEvent
} from '@/hooks/useWeeklyEvents'
import {
  DEFAULT_PASTE_EVENT_FLYER_TEMPLATE,
  parsePastedEventFlyer,
  WEEKLY_EVENT_PARTICIPANTS_MAX
} from '@/lib/parse-pasted-event-flyer'
import WeekRangeNavigator from '@/components/events/WeekRangeNavigator'
import {
  isEventInLocalWeek,
  startOfWeekMonday
} from '@/components/events/weekUtils'

function localDayBoundsYmd(ymd: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null
  const start = new Date(y, mo, d, 0, 0, 0, 0)
  const end = new Date(y, mo, d, 23, 59, 59, 999)
  return { start, end }
}

function eventStartsInDateRange(
  startsAtIso: string,
  fromYmd: string,
  toYmd: string
): boolean {
  const t = new Date(startsAtIso).getTime()
  if (Number.isNaN(t)) return false
  const fromTrim = fromYmd.trim()
  if (fromTrim) {
    const b = localDayBoundsYmd(fromTrim)
    if (!b || t < b.start.getTime()) return false
  }
  const toTrim = toYmd.trim()
  if (toTrim) {
    const b = localDayBoundsYmd(toTrim)
    if (!b || t > b.end.getTime()) return false
  }
  return true
}

function weekRangeLabel(anchor: Date): string {
  const weekStart = startOfWeekMonday(anchor)
  const end = new Date(weekStart)
  end.setDate(weekStart.getDate() + 6)
  const a = weekStart.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short'
  })
  const b = end.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return `${a} — ${b}`
}

function dateRangeSummaryLine(fromYmd: string, toYmd: string): string | null {
  const f = fromYmd.trim()
  const t = toYmd.trim()
  if (!f && !t) return null
  const fmt = (ymd: string) => {
    if (!ymd) return '…'
    const b = localDayBoundsYmd(ymd)
    return b
      ? b.start.toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'short'
        })
      : ymd
  }
  return `Inicio: ${fmt(f)} — ${fmt(t)}`
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type FormState = {
  title: string
  startsAtLocal: string
  state: WeeklyEventState
  kind: 'tournament' | 'trade_day' | 'other'
  game: 'pokemon' | 'magic' | 'other_tcg'
  pokemonSubtype: 'casual' | 'cup' | 'challenge' | ''
  priceClp: string
  gratis: boolean
  maxParticipants: string
  formatNotes: string
  prizesNotes: string
  location: string
  roundNum: string
  /** ID de liga Mongo o vacío. */
  leagueId: string
}

const emptyForm = (): FormState => ({
  title: '',
  startsAtLocal: toDatetimeLocalValue(new Date().toISOString()),
  state: 'schedule',
  kind: 'tournament',
  game: 'pokemon',
  pokemonSubtype: 'casual',
  priceClp: '0',
  gratis: true,
  maxParticipants: '8',
  formatNotes: '',
  prizesNotes: '',
  location: 'Av. Valparaíso 1195, Local 3',
  roundNum: '0',
  leagueId: ''
})

function kindLabelAdmin(k: AdminWeeklyEvent['kind']) {
  if (k === 'tournament') return 'Torneo'
  if (k === 'trade_day') return 'Intercambio'
  return 'Otro'
}

function gameLabelAdmin(g: AdminWeeklyEvent['game']) {
  if (g === 'pokemon') return 'Pokémon'
  if (g === 'magic') return 'Magic'
  return 'Otro TCG'
}

function eventStateLabel(s: WeeklyEventState) {
  if (s === 'running') return 'En curso'
  if (s === 'close') return 'Cerrado'
  return 'Programado'
}

function formFromEvent(ev: AdminWeeklyEvent): FormState {
  const state: WeeklyEventState =
    ev.state === 'running' || ev.state === 'close' ? ev.state : 'schedule'
  return {
    title: ev.title,
    startsAtLocal: toDatetimeLocalValue(ev.startsAt),
    state,
    kind: ev.kind,
    game: ev.game,
    pokemonSubtype:
      ev.pokemonSubtype === 'casual' ||
      ev.pokemonSubtype === 'cup' ||
      ev.pokemonSubtype === 'challenge'
        ? ev.pokemonSubtype
        : '',
    priceClp: String(ev.priceClp ?? 0),
    gratis: (ev.priceClp ?? 0) <= 0,
    maxParticipants: String(ev.maxParticipants ?? 8),
    formatNotes: ev.formatNotes ?? '',
    prizesNotes: ev.prizesNotes ?? '',
    location: ev.location ?? '',
    roundNum: String(ev.roundNum ?? 0),
    leagueId: ev.leagueId ?? ''
  }
}

export default function AdminEventosPage() {
  const { data, isPending, isError, error, refetch } = useAdminEvents()
  const createEv = useCreateAdminEvent()
  const updateEv = useUpdateAdminEvent()
  const deleteEv = useDeleteAdminEvent()
  const { data: leaguesData } = useAdminLeagues()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminWeeklyEvent | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminWeeklyEvent | null>(
    null
  )

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)

  const eventsSorted = useMemo(() => {
    const list = data?.events ?? []
    return [...list].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
  }, [data?.events])

  const eventsAfterDateFilter = useMemo(() => {
    if (!filterDateFrom.trim() && !filterDateTo.trim()) {
      return eventsSorted
    }
    return eventsSorted.filter(ev =>
      eventStartsInDateRange(ev.startsAt, filterDateFrom, filterDateTo)
    )
  }, [eventsSorted, filterDateFrom, filterDateTo])

  const eventsInSelectedWeek = useMemo(() => {
    return eventsAfterDateFilter.filter(ev =>
      isEventInLocalWeek(ev.startsAt, weekAnchor)
    )
  }, [eventsAfterDateFilter, weekAnchor])

  const hasDateRangeFilter = Boolean(
    filterDateFrom.trim() || filterDateTo.trim()
  )
  const dateSummary = dateRangeSummaryLine(filterDateFrom, filterDateTo)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (ev: AdminWeeklyEvent) => {
    setEditing(ev)
    setForm(formFromEvent(ev))
    setFormError(null)
    setDialogOpen(true)
  }

  const buildPayload = (): Record<string, unknown> => {
    const startsAt = new Date(form.startsAtLocal)
    if (Number.isNaN(startsAt.getTime())) {
      throw new Error('Fecha u hora inválida')
    }
    const maxParticipants = Math.round(Number(form.maxParticipants))
    if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
      throw new Error('Cupo máximo inválido')
    }
    const roundNum = Math.round(Number(form.roundNum))
    if (!Number.isFinite(roundNum) || roundNum < 0) {
      throw new Error('Número de ronda inválido')
    }
    let priceClp = 0
    if (form.kind === 'tournament') {
      if (!form.gratis) {
        const p = Math.round(Number(form.priceClp))
        if (!Number.isFinite(p) || p < 0) {
          throw new Error('Precio inválido')
        }
        priceClp = p
      }
    }
    const payload: Record<string, unknown> = {
      startsAt: startsAt.toISOString(),
      title: form.title.trim(),
      state: form.state,
      kind: form.kind,
      game: form.game,
      maxParticipants,
      formatNotes: form.formatNotes.trim(),
      prizesNotes: form.prizesNotes.trim(),
      location: form.location.trim(),
      priceClp,
      roundNum
    }
    if (form.kind === 'tournament' && form.game === 'pokemon') {
      if (!form.pokemonSubtype) {
        throw new Error('Selecciona el tipo de torneo Pokémon')
      }
      payload.pokemonSubtype = form.pokemonSubtype
    } else {
      payload.pokemonSubtype = null
    }
    if (form.kind === 'tournament') {
      payload.leagueId = form.leagueId.trim() || null
    } else {
      payload.leagueId = null
    }
    return payload
  }

  const handleSave = async () => {
    setFormError(null)
    let payload: Record<string, unknown>
    try {
      payload = buildPayload()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Datos inválidos')
      return
    }
    try {
      if (editing) {
        await updateEv.mutateAsync({ id: editing._id, body: payload })
      } else {
        await createEv.mutateAsync(payload)
      }
      setDialogOpen(false)
    } catch {
      /* error de red / API */
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteEv.mutateAsync(deleteTarget._id)
      setDeleteTarget(null)
    } catch {
      /* alert */
    }
  }

  const openPasteEvent = () => {
    setPasteError(null)
    setPasteText('')
    setPasteOpen(true)
  }

  const fillPasteTemplate = () => {
    setPasteText(DEFAULT_PASTE_EVENT_FLYER_TEMPLATE)
    setPasteError(null)
  }

  const handlePasteGenerate = async () => {
    setPasteError(null)
    const parsed = parsePastedEventFlyer(pasteText)
    if (!parsed.ok) {
      setPasteError(parsed.error)
      return
    }

    try {
      await createEv.mutateAsync(parsed.payload)
      setPasteOpen(false)
      setPasteText('')
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : 'Error al crear el evento')
    }
  }

  const dialogError =
    formError ??
    (createEv.error instanceof Error
      ? createEv.error.message
      : updateEv.error instanceof Error
        ? updateEv.error.message
        : null)

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      })}
    >
      <Container maxWidth="lg">
        <Stack
          spacing={2.5}
          sx={{
            mb: 3,
            p: { xs: 2, sm: 2.5 },
            borderRadius: { xs: 3, sm: 4 },
            border: '1px solid',
            borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
            bgcolor: 'background.paper',
            boxShadow: '0 20px 40px -24px rgba(24, 24, 27, 0.12)'
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            alignItems={{ xs: 'stretch', lg: 'flex-start' }}
            justifyContent="space-between"
            spacing={2.5}
          >
            <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <Button
                component={Link}
                href="/admin/users"
                variant="outlined"
                size="small"
                startIcon={<ArrowBack />}
                sx={{
                  alignSelf: 'flex-start',
                  borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.18)
                }}
              >
                Volver
              </Button>
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15
                  }}
                >
                  Eventos de la cartelera
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, maxWidth: 520, lineHeight: 1.6 }}
                >
                  Torneos con precio o entrada gratuita, jornadas de intercambio
                  y otros bloques. Lo publicado aquí aparece en el panel de los
                  jugadores.
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              useFlexGap
              sx={{
                alignSelf: { xs: 'stretch', lg: 'flex-start' },
                flexShrink: 0,
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={openCreate}
                sx={{
                  fontWeight: 700,
                  px: 2.5,
                  py: 1.25,
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Nuevo evento
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<ContentPaste />}
                onClick={openPasteEvent}
                sx={{
                  fontWeight: 700,
                  px: 2.5,
                  py: 1.25,
                  width: { xs: '100%', sm: 'auto' },
                  borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.22)
                }}
              >
                Pegar evento
              </Button>
            </Stack>
          </Stack>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            mb: 2.5,
            px: { xs: 1.75, sm: 2.25 },
            py: 1.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
            bgcolor: 'background.paper',
            boxShadow: '0 8px 24px -16px rgba(24, 24, 27, 0.12)'
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
              sx={{ minWidth: 0, flex: 1 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Vista del listado
              </Typography>
              <Chip
                size="small"
                label={weekRangeLabel(weekAnchor)}
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }
                }}
              />
              {dateSummary ? (
                <Chip
                  size="small"
                  label={dateSummary}
                  color="primary"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    maxWidth: '100%',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
              ) : null}
            </Stack>
            <Badge
              color="primary"
              variant="dot"
              invisible={!hasDateRangeFilter}
              overlap="rectangular"
              sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
            >
              <Button
                variant="outlined"
                size="medium"
                startIcon={<FilterList />}
                onClick={() => setFiltersModalOpen(true)}
                sx={{
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.2),
                  px: 2
                }}
              >
                Filtros
              </Button>
            </Badge>
          </Stack>
        </Paper>

        <Dialog
          open={filtersModalOpen}
          onClose={() => setFiltersModalOpen(false)}
          fullWidth
          maxWidth="sm"
          scroll="paper"
          aria-labelledby="admin-eventos-filters-title"
        >
          <DialogTitle
            component="div"
            id="admin-eventos-filters-title"
            sx={{
              pr: 1,
              pb: 1
            }}
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={1}
            >
              <Box sx={{ minWidth: 0, pt: 0.5 }}>
                <Typography
                  variant="h6"
                  component="span"
                  fontWeight={800}
                  sx={{ letterSpacing: '-0.02em' }}
                >
                  Filtros del listado
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, lineHeight: 1.5 }}
                >
                  Elige la semana y, si quieres, un rango por día de inicio.
                  Primero se aplica el rango de fechas; después solo se muestran
                  eventos de la semana seleccionada (hora local).
                </Typography>
              </Box>
              <IconButton
                aria-label="Cerrar"
                onClick={() => setFiltersModalOpen(false)}
                size="small"
                sx={{ color: 'text.secondary', mt: -0.25 }}
              >
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 2, pb: 1 }}>
            <Stack spacing={3}>
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ mb: 1.25 }}
                >
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 800 }}
                  >
                    Semana
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setWeekAnchor(new Date())}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    Esta semana
                  </Button>
                </Stack>
                <WeekRangeNavigator
                  weekAnchor={weekAnchor}
                  onWeekAnchorChange={setWeekAnchor}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}
                >
                  Solo cuentan los eventos cuya fecha y hora de inicio caen
                  entre el lunes y el domingo de esta semana.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 800, display: 'block', mb: 1.25 }}
                >
                  Rango por día de inicio
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'flex-start' }}
                >
                  <TextField
                    label="Desde"
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="Hasta"
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Stack>
                <Button
                  size="small"
                  onClick={() => {
                    setFilterDateFrom('')
                    setFilterDateTo('')
                  }}
                  disabled={!filterDateFrom && !filterDateTo}
                  sx={{ mt: 1.5, fontWeight: 600, textTransform: 'none' }}
                >
                  Limpiar rango de fechas
                </Button>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              bgcolor: t => alpha(t.palette.text.primary, 0.03)
            }}
          >
            <Button
              onClick={() => setFiltersModalOpen(false)}
              color="inherit"
              sx={{ fontWeight: 600 }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {isPending ? (
          <Stack spacing={1.5}>
            {[0, 1, 2].map(i => (
              <Box
                key={i}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: (t: Theme) =>
                    alpha(t.palette.text.primary, 0.08),
                  bgcolor: 'background.paper',
                  p: 2.5
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        height: 14,
                        width: '40%',
                        borderRadius: 1,
                        bgcolor: (t: Theme) =>
                          alpha(t.palette.text.primary, 0.08),
                        mb: 1.5
                      }}
                    />
                    <Box
                      sx={{
                        height: 22,
                        width: '70%',
                        borderRadius: 1,
                        bgcolor: (t: Theme) =>
                          alpha(t.palette.text.primary, 0.1),
                        mb: 1
                      }}
                    />
                    <Box
                      sx={{
                        height: 12,
                        width: '55%',
                        borderRadius: 1,
                        bgcolor: (t: Theme) =>
                          alpha(t.palette.text.primary, 0.06)
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            ))}
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
            {error instanceof Error ? error.message : 'Error al cargar'}
          </Alert>
        ) : (
          <Stack spacing={0}>
            {eventsSorted.length > 0 &&
            eventsAfterDateFilter.length === 0 &&
            (filterDateFrom.trim() !== '' || filterDateTo.trim() !== '') ? (
              <Paper
                variant="outlined"
                sx={{
                  py: 5,
                  px: 3,
                  textAlign: 'left',
                  borderRadius: 4,
                  borderStyle: 'dashed',
                  borderColor: (t: Theme) =>
                    alpha(t.palette.text.primary, 0.14),
                  bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.02)
                }}
              >
                <Typography fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                  Ningún evento en ese rango de fechas
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, maxWidth: 520 }}
                >
                  Abre Filtros y ajusta el rango por día de inicio, o pulsa
                  «Limpiar rango de fechas» dentro del modal. Hay{' '}
                  {eventsSorted.length} evento
                  {eventsSorted.length === 1 ? '' : 's'} sin filtrar por fecha.
                </Typography>
              </Paper>
            ) : eventsSorted.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  py: 6,
                  px: 3,
                  textAlign: 'left',
                  borderRadius: 4,
                  borderStyle: 'dashed',
                  borderColor: (t: Theme) =>
                    alpha(t.palette.text.primary, 0.14),
                  bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.02)
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ sm: 'center' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      bgcolor: (t: Theme) =>
                        alpha(t.palette.text.primary, 0.06),
                      color: 'text.secondary',
                      flexShrink: 0
                    }}
                  >
                    <EventAvailable sx={{ fontSize: 26 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      fontWeight={800}
                      sx={{ letterSpacing: '-0.02em' }}
                    >
                      Aún no hay eventos publicados
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.75, maxWidth: 480 }}
                    >
                      Cuando crees el primero, los jugadores lo verán en su
                      dashboard con fecha, cupo y precio.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={openCreate}
                      sx={{ mt: 2, fontWeight: 700 }}
                    >
                      Crear evento
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            ) : eventsInSelectedWeek.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  py: 5,
                  px: 3,
                  textAlign: 'left',
                  borderRadius: 4,
                  borderStyle: 'dashed',
                  borderColor: (t: Theme) =>
                    alpha(t.palette.text.primary, 0.14),
                  bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.02)
                }}
              >
                <Typography fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                  No hay eventos en esta semana
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, maxWidth: 520 }}
                >
                  Abre Filtros para cambiar de semana o ajustar el rango por día
                  de inicio, o crea un evento cuya fecha caiga en la semana
                  mostrada. Hay {eventsAfterDateFilter.length} evento
                  {eventsAfterDateFilter.length === 1 ? '' : 's'} en el rango
                  actual
                  {filterDateFrom || filterDateTo
                    ? ' (con filtro de fechas activo)'
                    : ''}{' '}
                  fuera de esta semana.
                </Typography>
                <Button
                  variant="contained"
                  onClick={openCreate}
                  sx={{ mt: 2, fontWeight: 700 }}
                >
                  Nuevo evento
                </Button>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: (t: Theme) =>
                    alpha(t.palette.text.primary, 0.08),
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  boxShadow: '0 20px 40px -24px rgba(24, 24, 27, 0.1)'
                }}
              >
                <Box
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1.75,
                    borderBottom: '1px solid',
                    borderColor: (t: Theme) =>
                      alpha(t.palette.text.primary, 0.08),
                    bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.02)
                  }}
                >
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 800, letterSpacing: '0.12em' }}
                  >
                    Esta semana
                  </Typography>
                </Box>
                <Stack
                  divider={<Divider flexItem />}
                  sx={{ '& > *': { px: { xs: 2, sm: 2.5 }, py: 2.25 } }}
                >
                  {eventsInSelectedWeek.map(ev => (
                    <Stack
                      key={ev._id}
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2}
                      alignItems={{ md: 'flex-start' }}
                      justifyContent="space-between"
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2.5}
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        <Box
                          sx={{
                            minWidth: { sm: 120, md: 140 },
                            typography: 'caption',
                            color: 'text.secondary',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          {new Date(ev.startsAt).toLocaleDateString('es-CL', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                          <Box
                            component="span"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              fontWeight: 600,
                              letterSpacing: '0.04em'
                            }}
                          >
                            {new Date(ev.startsAt).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            component="h2"
                            sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                          >
                            {ev.title}
                          </Typography>
                          <Stack
                            direction="row"
                            flexWrap="wrap"
                            gap={0.75}
                            useFlexGap
                            sx={{ mt: 1.25, mb: 1.5 }}
                          >
                            <Chip
                              size="small"
                              label={eventStateLabel(
                                ev.state === 'running' || ev.state === 'close'
                                  ? ev.state
                                  : 'schedule'
                              )}
                              color={
                                ev.state === 'running'
                                  ? 'success'
                                  : ev.state === 'close'
                                    ? 'default'
                                    : 'info'
                              }
                              variant={
                                ev.state === 'schedule' ? 'outlined' : 'filled'
                              }
                            />
                            <Chip
                              size="small"
                              label={kindLabelAdmin(ev.kind)}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={gameLabelAdmin(ev.game)}
                              variant="outlined"
                            />
                            {ev.kind === 'tournament' &&
                            ev.game === 'pokemon' &&
                            ev.pokemonSubtype ? (
                              <Chip
                                size="small"
                                label={ev.pokemonSubtype}
                                color="primary"
                                variant="outlined"
                              />
                            ) : null}
                            {ev.kind === 'tournament' && ev.league ? (
                              <Chip
                                size="small"
                                component={Link}
                                href={`/ligas/${encodeURIComponent(ev.league.slug)}`}
                                clickable
                                label={ev.league.name}
                                color="secondary"
                                variant="outlined"
                              />
                            ) : null}
                          </Stack>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={{ xs: 0.5, sm: 3 }}
                            sx={{
                              typography: 'body2',
                              color: 'text.secondary',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          >
                            <span>
                              <Box
                                component="span"
                                sx={{ color: 'text.primary', fontWeight: 600 }}
                              >
                                Precio
                              </Box>{' '}
                              {ev.kind === 'tournament'
                                ? ev.priceClp > 0
                                  ? `${ev.priceClp.toLocaleString('es-CL')} CLP`
                                  : 'Gratis'
                                : '—'}
                            </span>
                            <span>
                              <Box
                                component="span"
                                sx={{ color: 'text.primary', fontWeight: 600 }}
                              >
                                Cupo
                              </Box>{' '}
                              {ev.maxParticipants >=
                              WEEKLY_EVENT_PARTICIPANTS_MAX
                                ? 'Ilimitado'
                                : ev.maxParticipants}
                            </span>
                            <span>
                              <Box
                                component="span"
                                sx={{ color: 'text.primary', fontWeight: 600 }}
                              >
                                Inscritos
                              </Box>{' '}
                              {ev.participants?.length ?? 0}
                            </span>
                          </Stack>
                          <Button
                            component={Link}
                            href={`/admin/eventos/${ev._id}`}
                            size="medium"
                            variant="outlined"
                            sx={{
                              mt: 2,
                              fontWeight: 600,
                              alignSelf: 'flex-start',
                              borderColor: (t: Theme) =>
                                alpha(t.palette.primary.main, 0.35)
                            }}
                          >
                            Abrir detalle
                          </Button>
                        </Box>
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{
                          alignSelf: { xs: 'flex-end', md: 'flex-start' },
                          flexShrink: 0
                        }}
                      >
                        <Tooltip title="Editar evento">
                          <IconButton
                            aria-label="Editar"
                            color="primary"
                            onClick={() => openEdit(ev)}
                            size="medium"
                            sx={{
                              border: '1px solid',
                              borderColor: (t: Theme) =>
                                alpha(t.palette.primary.main, 0.25)
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar evento">
                          <IconButton
                            aria-label="Eliminar"
                            color="error"
                            onClick={() => setDeleteTarget(ev)}
                            size="medium"
                            sx={{
                              border: '1px solid',
                              borderColor: (t: Theme) =>
                                alpha(t.palette.error.main, 0.25)
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Container>

      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        aria-labelledby="paste-event-dialog-title"
      >
        <DialogTitle id="paste-event-dialog-title">
          <Stack spacing={0.5}>
            <Typography component="span" variant="h6" fontWeight={800}>
              Pegar evento
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={400}>
              Pega el texto del cartel (título en la primera línea, fecha tipo
              «18 DE ABRIL 17:00», valor y lugar). Usa Crear plantilla para un
              ejemplo que ya incluye una línea de cupo al final; puedes editarla
              o borrarla.
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {pasteError ? <Alert severity="error">{pasteError}</Alert> : null}
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={fillPasteTemplate}
              sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
            >
              Crear plantilla
            </Button>
            <TextField
              label="Texto del cartel"
              value={pasteText}
              onChange={e => {
                setPasteText(e.target.value)
                setPasteError(null)
              }}
              fullWidth
              multiline
              minRows={15}
              placeholder={DEFAULT_PASTE_EVENT_FLYER_TEMPLATE}
              helperText="Incluye al final una línea como «Cupos 16» si quieres cupo limitado; sin esa línea, ilimitado."
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: t => alpha(t.palette.text.primary, 0.03)
          }}
        >
          <Button onClick={() => setPasteOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => void handlePasteGenerate()}
            disabled={createEv.isPending}
            sx={{ fontWeight: 700, minWidth: 140 }}
          >
            Generar torneo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        aria-labelledby="event-dialog-title"
      >
        <DialogTitle id="event-dialog-title">
          <Stack spacing={0.5}>
            <Typography component="span" variant="h6" fontWeight={800}>
              {editing ? 'Editar evento' : 'Nuevo evento'}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={400}>
              Fecha, tipo de actividad, precio si aplica y datos para el cartel
              público.
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
            <Box>
              <Typography
                variant="overline"
                color="primary"
                fontWeight={800}
                sx={{ display: 'block', mb: 1 }}
              >
                General
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Título"
                  value={form.title}
                  onChange={e =>
                    setForm(f => ({ ...f, title: e.target.value }))
                  }
                  fullWidth
                  required
                />
                <TextField
                  label="Inicio"
                  type="datetime-local"
                  value={form.startsAtLocal}
                  onChange={e =>
                    setForm(f => ({ ...f, startsAtLocal: e.target.value }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <FormControl fullWidth>
                  <InputLabel id="event-state-label">Estado</InputLabel>
                  <Select
                    labelId="event-state-label"
                    label="Estado"
                    value={form.state}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        state: e.target.value as WeeklyEventState
                      }))
                    }
                  >
                    <MenuItem value="schedule">Programado</MenuItem>
                    <MenuItem value="running">En curso</MenuItem>
                    <MenuItem value="close">Cerrado</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Ronda (número)"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={form.roundNum}
                  onChange={e =>
                    setForm(f => ({ ...f, roundNum: e.target.value }))
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel id="kind-label">Tipo</InputLabel>
                  <Select
                    labelId="kind-label"
                    label="Tipo"
                    value={form.kind}
                    onChange={e => {
                      const kind = e.target.value as FormState['kind']
                      setForm(f => ({
                        ...f,
                        kind,
                        leagueId: kind === 'tournament' ? f.leagueId : '',
                        pokemonSubtype:
                          kind === 'tournament' && f.game === 'pokemon'
                            ? f.pokemonSubtype || 'casual'
                            : ''
                      }))
                    }}
                  >
                    <MenuItem value="tournament">Torneo</MenuItem>
                    <MenuItem value="trade_day">
                      Jornada de intercambio
                    </MenuItem>
                    <MenuItem value="other">Otro</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="game-label">Juego / comunidad</InputLabel>
                  <Select
                    labelId="game-label"
                    label="Juego / comunidad"
                    value={form.game}
                    onChange={e => {
                      const game = e.target.value as FormState['game']
                      setForm(f => ({
                        ...f,
                        game,
                        pokemonSubtype:
                          f.kind === 'tournament' && game === 'pokemon'
                            ? f.pokemonSubtype || 'casual'
                            : ''
                      }))
                    }}
                  >
                    <MenuItem value="pokemon">Pokémon</MenuItem>
                    <MenuItem value="magic">Magic</MenuItem>
                    <MenuItem value="other_tcg">Otro TCG</MenuItem>
                  </Select>
                </FormControl>
                {form.kind === 'tournament' && form.game === 'pokemon' ? (
                  <FormControl fullWidth>
                    <InputLabel id="pk-label">Torneo Pokémon</InputLabel>
                    <Select
                      labelId="pk-label"
                      label="Torneo Pokémon"
                      value={form.pokemonSubtype || 'casual'}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          pokemonSubtype: e.target
                            .value as FormState['pokemonSubtype']
                        }))
                      }
                    >
                      <MenuItem value="casual">Casual</MenuItem>
                      <MenuItem value="cup">Cup</MenuItem>
                      <MenuItem value="challenge">Challenge</MenuItem>
                    </Select>
                  </FormControl>
                ) : null}
                {form.kind === 'tournament' ? (
                  <FormControl fullWidth>
                    <InputLabel id="league-label">Liga (opcional)</InputLabel>
                    <Select
                      labelId="league-label"
                      label="Liga (opcional)"
                      value={form.leagueId}
                      onChange={e =>
                        setForm(f => ({ ...f, leagueId: e.target.value }))
                      }
                    >
                      <MenuItem value="">Sin liga</MenuItem>
                      {(leaguesData?.leagues ?? [])
                        .filter(l => l.isActive)
                        .map(l => (
                          <MenuItem key={l._id} value={l._id}>
                            {l.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                ) : null}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="overline"
                color="primary"
                fontWeight={800}
                sx={{ display: 'block', mb: 1 }}
              >
                Precio y cupo
              </Typography>
              <Stack spacing={2}>
                {form.kind === 'tournament' ? (
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.gratis}
                          onChange={e =>
                            setForm(f => ({ ...f, gratis: e.target.checked }))
                          }
                        />
                      }
                      label="Gratuito"
                    />
                    {!form.gratis ? (
                      <TextField
                        label="Precio (CLP)"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={form.priceClp}
                        onChange={e =>
                          setForm(f => ({ ...f, priceClp: e.target.value }))
                        }
                        fullWidth
                      />
                    ) : null}
                  </Stack>
                ) : null}
                <TextField
                  label="Cupo máximo (número)"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={form.maxParticipants}
                  onChange={e =>
                    setForm(f => ({ ...f, maxParticipants: e.target.value }))
                  }
                  fullWidth
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="overline"
                color="primary"
                fontWeight={800}
                sx={{ display: 'block', mb: 1 }}
              >
                Textos para el público
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Formato / rondas"
                  value={form.formatNotes}
                  onChange={e =>
                    setForm(f => ({ ...f, formatNotes: e.target.value }))
                  }
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Premios"
                  value={form.prizesNotes}
                  onChange={e =>
                    setForm(f => ({ ...f, prizesNotes: e.target.value }))
                  }
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Ubicación"
                  value={form.location}
                  onChange={e =>
                    setForm(f => ({ ...f, location: e.target.value }))
                  }
                  fullWidth
                />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: t => alpha(t.palette.text.primary, 0.03)
          }}
        >
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => void handleSave()}
            disabled={createEv.isPending || updateEv.isPending}
            sx={{ fontWeight: 700, minWidth: 120 }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        aria-labelledby="delete-event-title"
      >
        <DialogTitle id="delete-event-title">Eliminar evento</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar &quot;{deleteTarget?.title}&quot;? Esta acción no se puede
            deshacer.
          </Typography>
          {deleteEv.error instanceof Error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteEv.error.message}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDelete()}
            disabled={deleteEv.isPending}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
