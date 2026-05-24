'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import FilterListIcon from '@mui/icons-material/FilterList'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import ManualReportDeckEditor from '@/components/admin/ManualReportDeckEditor'
import {
  useOwnerManualReportEventDetail,
  useOwnerManualReportEvents,
  useOwnerManualReportStores,
  type OwnerManualReportEventRow,
  type OwnerManualReportParticipant
} from '@/hooks/useOwnerManualReport'

const STATE_LABEL: Record<string, string> = {
  schedule: 'Programado',
  running: 'En curso',
  close: 'Cerrado'
}

function formatEventWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/** Evita SSR de Autocomplete MUI (ids estables tras hidratar). */
function useClientReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

function StepBadge({ n, label }: { n: number; label: string }) {
  const theme = useTheme()
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 800,
          color: theme.palette.primary.contrastText,
          bgcolor: theme.palette.primary.main,
          flexShrink: 0
        }}
      >
        {n}
      </Box>
      <Typography
        variant="overline"
        sx={{
          letterSpacing: '0.1em',
          fontWeight: 700,
          color: 'text.secondary',
          lineHeight: 1.2
        }}
      >
        {label}
      </Typography>
    </Stack>
  )
}

export default function ReporteManualPage() {
  const theme = useTheme()
  const [storeFilter, setStoreFilter] = useState<{
    id: string
    name: string
  } | null>(null)
  const [eventPick, setEventPick] = useState<OwnerManualReportEventRow | null>(
    null
  )
  const [participantPick, setParticipantPick] =
    useState<OwnerManualReportParticipant | null>(null)
  const clientReady = useClientReady()

  const storesQuery = useOwnerManualReportStores()
  const eventsQuery = useOwnerManualReportEvents(storeFilter?.id ?? null)
  const eventDetailQuery = useOwnerManualReportEventDetail(
    eventPick?._id ?? null
  )

  const storeOptions = useMemo(() => storesQuery.data ?? [], [storesQuery.data])

  const eventParticipants = useMemo(
    () => eventDetailQuery.data?.participants ?? [],
    [eventDetailQuery.data?.participants]
  )

  const participantsWithoutAccountCount = useMemo(
    () => eventParticipants.filter(p => !p.userId).length,
    [eventParticipants]
  )

  const panelSx = {
    p: { xs: 2, sm: 2.5 },
    borderRadius: 3,
    border: '1px solid',
    borderColor: alpha(theme.palette.text.primary, 0.08),
    bgcolor: 'background.paper',
    boxShadow: `0 20px 48px -28px ${alpha(theme.palette.common.black, 0.14)}`
  } as const

  return (
    <Box
      sx={{
        minHeight: 'min(100dvh, 1200px)',
        py: { xs: 2.5, md: 4 },
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.background.default} 32%)`
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'flex-end' }}
            justifyContent="space-between"
          >
            <Box sx={{ maxWidth: 560 }}>
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main'
                  }}
                >
                  <AssignmentOutlinedIcon />
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1
                  }}
                >
                  Reporte manual
                </Typography>
              </Stack>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ lineHeight: 1.65 }}
              >
                Herramienta exclusiva del owner: elige un torneo Pokémon de
                cualquier tienda y asigna sprites a cualquier inscrito (con o
                sin cuenta). El listado guardado solo si el jugador tiene cuenta
                vinculada. Los datos no se muestran a otros participantes.
              </Typography>
            </Box>
            <Chip
              label="Solo owner HQ"
              color="primary"
              variant="outlined"
              sx={{
                fontWeight: 700,
                alignSelf: { xs: 'flex-start', sm: 'center' }
              }}
            />
          </Stack>

          <Grid container spacing={{ xs: 2.5, md: 3 }} alignItems="stretch">
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={panelSx}>
                <StepBadge n={1} label="Contexto" />
                {!clientReady ? (
                  <Stack spacing={2}>
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" height={56} />
                  </Stack>
                ) : (
                  <Stack spacing={2.5} divider={<Divider flexItem />}>
                    <Box>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <StorefrontOutlinedIcon
                          fontSize="small"
                          color="action"
                        />
                        <Typography variant="subtitle2" fontWeight={700}>
                          Tienda
                        </Typography>
                      </Stack>
                      <Autocomplete
                        id="owner-manual-report-store"
                        options={storeOptions}
                        loading={storesQuery.isPending}
                        value={storeFilter}
                        onChange={(_e, v) => {
                          setStoreFilter(v)
                          setEventPick(null)
                          setParticipantPick(null)
                        }}
                        getOptionLabel={o => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={params => (
                          <TextField
                            {...params}
                            id="owner-manual-report-store"
                            placeholder="Todas las tiendas"
                            size="small"
                            helperText="Vacío = ver torneos de todas las tiendas"
                          />
                        )}
                      />
                    </Box>

                    <Box>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <FilterListIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          Evento
                        </Typography>
                      </Stack>
                      {eventsQuery.isPending ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            Cargando torneos…
                          </Typography>
                        </Stack>
                      ) : eventsQuery.isError ? (
                        <Alert severity="error" variant="outlined">
                          {eventsQuery.error instanceof Error
                            ? eventsQuery.error.message
                            : 'Error'}
                        </Alert>
                      ) : (
                        <Autocomplete
                          id="owner-manual-report-event"
                          options={eventsQuery.data ?? []}
                          value={eventPick}
                          onChange={(_e, v) => {
                            setEventPick(v)
                            setParticipantPick(null)
                          }}
                          getOptionLabel={e =>
                            `${e.title} · ${formatEventWhen(e.startsAt)}`
                          }
                          isOptionEqualToValue={(a, b) => a._id === b._id}
                          renderOption={(props, option) => {
                            const { key, ...rest } = props
                            return (
                              <li key={key} {...rest}>
                                <Stack spacing={0.25} sx={{ py: 0.5 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {option.title}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {option.storeName} ·{' '}
                                    {formatEventWhen(option.startsAt)} ·{' '}
                                    {STATE_LABEL[option.state] ?? option.state}
                                  </Typography>
                                </Stack>
                              </li>
                            )
                          }}
                          renderInput={params => (
                            <TextField
                              {...params}
                              id="owner-manual-report-event"
                              size="small"
                              placeholder="Buscar torneo Pokémon"
                            />
                          )}
                        />
                      )}
                    </Box>

                    <Box>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <PersonOutlineIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          Jugador
                        </Typography>
                      </Stack>
                      {!eventPick ? (
                        <Typography variant="body2" color="text.secondary">
                          Selecciona un evento primero.
                        </Typography>
                      ) : eventDetailQuery.isPending ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            Cargando inscritos…
                          </Typography>
                        </Stack>
                      ) : (
                        <Autocomplete
                          id="owner-manual-report-participant"
                          options={eventParticipants}
                          value={participantPick}
                          onChange={(_e, v) => setParticipantPick(v)}
                          getOptionLabel={p => p.displayName}
                          isOptionEqualToValue={(a, b) =>
                            a.participantId === b.participantId
                          }
                          renderOption={(props, p) => {
                            const { key, ...rest } = props
                            const hasDeck = p.deckPokemonSlugs.length > 0
                            const hasAccount = Boolean(p.userId)
                            return (
                              <li key={key} {...rest}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  spacing={1}
                                  sx={{ width: '100%', py: 0.25 }}
                                >
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                    >
                                      {p.displayName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      noWrap
                                    >
                                      {hasAccount
                                        ? p.userEmail || p.popId || 'Con cuenta'
                                        : p.popId
                                          ? `POP ${p.popId} · sin cuenta`
                                          : 'Sin cuenta'}
                                    </Typography>
                                  </Box>
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    flexShrink={0}
                                  >
                                    {!hasAccount ? (
                                      <Chip
                                        size="small"
                                        label="Solo sprites"
                                        color="warning"
                                        variant="outlined"
                                        sx={{ fontSize: '0.65rem' }}
                                      />
                                    ) : null}
                                    <Chip
                                      size="small"
                                      label={hasDeck ? 'Con deck' : 'Sin deck'}
                                      color={hasDeck ? 'success' : 'default'}
                                      variant="outlined"
                                    />
                                  </Stack>
                                </Stack>
                              </li>
                            )
                          }}
                          renderInput={params => (
                            <TextField
                              {...params}
                              id="owner-manual-report-participant"
                              size="small"
                              placeholder="Buscar inscrito"
                            />
                          )}
                        />
                      )}
                      {participantsWithoutAccountCount > 0 ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}
                        >
                          {participantsWithoutAccountCount} inscrito(s) sin
                          cuenta: puedes asignarles sprites aquí (no listado
                          guardado).
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Paper
                elevation={0}
                sx={{
                  ...panelSx,
                  minHeight: { md: 420 },
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <StepBadge n={2} label="Deck del jugador" />
                {!participantPick || !eventPick ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 6,
                      px: 2,
                      textAlign: 'center',
                      borderRadius: 2.5,
                      border: '1px dashed',
                      borderColor: alpha(theme.palette.text.primary, 0.12),
                      bgcolor: alpha(theme.palette.primary.main, 0.02)
                    }}
                  >
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ maxWidth: 360, lineHeight: 1.6 }}
                    >
                      Elige tienda, torneo y jugador para editar sprites y
                      listado.
                    </Typography>
                  </Box>
                ) : (
                  <ManualReportDeckEditor
                    key={`${eventPick._id}-${participantPick.participantId}`}
                    eventId={eventPick._id}
                    participant={
                      eventDetailQuery.data?.participants.find(
                        p => p.participantId === participantPick.participantId
                      ) ?? participantPick
                    }
                    onSaved={() => {
                      void eventDetailQuery.refetch()
                    }}
                  />
                )}
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}
