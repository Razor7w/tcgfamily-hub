'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { alpha } from '@mui/material/styles'
import {
  ArrowBack,
  CheckCircle,
  Groups,
  InfoOutlined,
  Settings,
  UploadFile
} from '@mui/icons-material'
import TournamentTdfLoader from '@/components/admin/TournamentTdfLoader'
import AdminEventDetailExtras from '@/components/admin/AdminEventDetailExtras'
import AdminEventTdfWorkflowGuide from '@/components/admin/AdminEventTdfWorkflowGuide'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import { popidForStorage } from '@/lib/rut-chile'
import {
  AdminWeeklyEvent,
  type WeeklyEventState,
  useAdminEvents,
  useAdminLeagues,
  useConfirmParticipantParticipation,
  useLinkParticipantByPop,
  useUpdateAdminEvent
} from '@/hooks/useWeeklyEvents'

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

function eventNextStepHint(ev: AdminWeeklyEvent): string {
  if (ev.kind !== 'tournament') {
    return 'Confirma asistencia en la lista de preinscritos.'
  }
  const rounds = ev.roundSnapshots?.length ?? 0
  if (ev.state === 'close') {
    return 'Torneo cerrado. Revisa la clasificación en la pestaña TDF si hace falta corregir puestos.'
  }
  if (rounds > 0) {
    return `Hay ${rounds} ronda(s) publicada(s). Al terminar, carga el TDF, unifica categorías y guarda Sénior.`
  }
  if ((ev.participants?.length ?? 0) === 0) {
    return 'Primero revisa preinscritos o carga el TDF para añadir jugadores.'
  }
  return 'Confirma asistencia en tienda, luego usa TDF para publicar rondas y cerrar.'
}

export default function AdminEventoDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const { data, isPending, isError, error, refetch } = useAdminEvents()
  const { data: leaguesData } = useAdminLeagues()
  const confirmParticipation = useConfirmParticipantParticipation()
  const linkByPop = useLinkParticipantByPop()
  const updateEv = useUpdateAdminEvent()

  const ev = useMemo(
    () => (id ? (data?.events.find(e => e._id === id) ?? null) : null),
    [data?.events, id]
  )

  const registeredPopIdsForTdf = useMemo(
    () =>
      ev
        ? ev.participants
            .map(p => popidForStorage(p.popId ?? ''))
            .filter(pid => pid.length > 0)
        : [],
    [ev]
  )

  const syncedRoundNumsForTdf = useMemo(
    () => ev?.roundSnapshots?.map(s => s.roundNum) ?? [],
    [ev?.roundSnapshots]
  )

  const showTdfTab = ev?.kind === 'tournament'
  const participantCount = ev?.participants?.length ?? 0
  const savedRounds = ev?.roundSnapshots?.length ?? 0

  const [tab, setTab] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leagueIdInput, setLeagueIdInput] = useState('')
  const [settingsSyncKey, setSettingsSyncKey] = useState<string | null>(null)

  const evSettingsKey = ev ? `${ev._id}|${ev.leagueId ?? ''}` : `none:${id}`

  if (evSettingsKey !== settingsSyncKey) {
    setSettingsSyncKey(evSettingsKey)
    if (!ev) {
      setLeagueIdInput('')
    } else {
      setLeagueIdInput(ev.leagueId ?? '')
    }
  }

  useEffect(() => {
    if (!ev) return
    const rounds = ev.roundSnapshots?.length ?? 0
    const preferTdf =
      ev.kind === 'tournament' &&
      (rounds > 0 || ev.state === 'close' || ev.state === 'running')
    setTab(preferTdf ? 1 : 0)
  }, [ev?._id])

  useEffect(() => {
    if (!showTdfTab && tab !== 0) setTab(0)
  }, [showTdfTab, tab])

  const saveLeagueAssignment = async () => {
    if (!ev || ev.kind !== 'tournament') return
    try {
      await updateEv.mutateAsync({
        id: ev._id,
        body: { leagueId: leagueIdInput.trim() || null }
      })
      setSettingsOpen(false)
    } catch {
      /* error en estado */
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 3 }
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Button
            component={Link}
            href="/admin/eventos"
            variant="text"
            size="small"
            startIcon={<ArrowBack />}
            sx={{ alignSelf: 'flex-start', fontWeight: 600, px: 0.5 }}
          >
            Eventos
          </Button>

          {isPending ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                p: 3
              }}
            >
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    height: 28,
                    width: '55%',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                />
                <Box
                  sx={{
                    height: 18,
                    width: '35%',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                />
                <Box
                  sx={{
                    height: 120,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    mt: 1
                  }}
                />
              </Stack>
            </Paper>
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
          ) : !ev ? (
            <Alert severity="warning">
              No se encontró el evento.{' '}
              <Link href="/admin/eventos" style={{ fontWeight: 600 }}>
                Volver al listado
              </Link>
            </Alert>
          ) : (
            <>
              <Alert
                severity={
                  ev.state === 'running'
                    ? 'success'
                    : ev.state === 'close'
                      ? 'info'
                      : 'warning'
                }
                variant="outlined"
                sx={{ borderRadius: 2.5 }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {eventStateLabel(
                    ev.state === 'running' || ev.state === 'close'
                      ? ev.state
                      : 'schedule'
                  )}
                  {' — '}
                  {eventNextStepHint(ev)}
                </Typography>
              </Alert>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ sm: 'flex-start' }}
                  justifyContent="space-between"
                >
                  <AdminStorePageHeading alignItems="flex-start">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                          fontWeight: 800,
                          letterSpacing: '-0.02em',
                          lineHeight: 1.2,
                          textWrap: 'balance'
                        }}
                      >
                        {ev.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {new Date(ev.startsAt).toLocaleString('es-CL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={0.75}
                        sx={{ mt: 1.5 }}
                        useFlexGap
                      >
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
                        {ev.kind === 'tournament' ? (
                          <Chip
                            size="small"
                            label={ev.league?.name ?? 'Sin liga'}
                            color={ev.league ? 'secondary' : 'default'}
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                    </Box>
                  </AdminStorePageHeading>
                  {ev.kind === 'tournament' ? (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Settings />}
                      onClick={() => setSettingsOpen(true)}
                      sx={{
                        alignSelf: { xs: 'stretch', sm: 'flex-start' },
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                    >
                      Liga
                    </Button>
                  ) : null}
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, 1fr)',
                      sm: 'repeat(3, 1fr)'
                    },
                    gap: 1.25,
                    mt: 2.5
                  }}
                >
                  <StatTile
                    label="Preinscritos"
                    value={String(participantCount)}
                  />
                  {showTdfTab ? (
                    <StatTile
                      label="Rondas publicadas"
                      value={String(savedRounds)}
                    />
                  ) : (
                    <StatTile label="Estado" value={eventStateLabel(
                      ev.state === 'running' || ev.state === 'close'
                        ? ev.state
                        : 'schedule'
                    )} />
                  )}
                  <StatTile
                    label="Ronda activa"
                    value={
                      showTdfTab && (ev.roundNum ?? 0) > 0
                        ? String(ev.roundNum)
                        : '—'
                    }
                    sx={{
                      gridColumn: { xs: '1 / -1', sm: 'auto' }
                    }}
                  />
                </Box>
              </Paper>

              <AdminEventDetailExtras ev={ev} />

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  aria-label="Secciones del evento"
                  variant="fullWidth"
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    '& .MuiTab-root': {
                      fontWeight: 600,
                      textTransform: 'none',
                      minHeight: 52,
                      py: 1.25,
                      color: 'text.secondary',
                      transition: 'color 0.2s ease, background-color 0.2s ease'
                    },
                    '& .MuiTab-root.Mui-selected': {
                      color: 'primary.main',
                      fontWeight: 700,
                      bgcolor: theme => alpha(theme.palette.primary.main, 0.08)
                    },
                    '& .MuiTabs-indicator': {
                      height: 3,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}
                >
                  <Tab
                    icon={<Groups sx={{ fontSize: 20 }} />}
                    iconPosition="start"
                    label="Asistencia"
                    id="event-tab-preinscritos"
                    aria-controls="event-tabpanel-preinscritos"
                  />
                  {showTdfTab ? (
                    <Tab
                      icon={<UploadFile sx={{ fontSize: 20 }} />}
                      iconPosition="start"
                      label="Resultados TDF"
                      id="event-tab-tdf"
                      aria-controls="event-tabpanel-tdf"
                    />
                  ) : null}
                </Tabs>

                <Box
                  role="tabpanel"
                  hidden={tab !== 0}
                  id="event-tabpanel-preinscritos"
                  aria-labelledby="event-tab-preinscritos"
                  sx={{ p: { xs: 2, sm: 2.5 } }}
                >
                  {tab === 0 ? (
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        Marca quién asistió en tienda. Necesitan cuenta
                        vinculada para confirmar.
                      </Typography>
                      {confirmParticipation.isError ? (
                        <Alert severity="error">
                          {confirmParticipation.error instanceof Error
                            ? confirmParticipation.error.message
                            : 'Error'}
                        </Alert>
                      ) : null}
                      {ev.participants.length === 0 ? (
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            textAlign: 'center',
                            bgcolor: 'background.paper',
                            borderStyle: 'dashed'
                          }}
                        >
                          <Typography color="text.secondary">
                            Nadie preinscrito aún.
                          </Typography>
                          {showTdfTab ? (
                            <Button
                              size="small"
                              sx={{ mt: 1.5, fontWeight: 600 }}
                              onClick={() => setTab(1)}
                            >
                              Ir a Resultados TDF
                            </Button>
                          ) : null}
                        </Paper>
                      ) : (
                        <Stack spacing={1}>
                          {ev.participants.map((p, idx) => {
                            const canConfirm = Boolean(p.userId)
                            return (
                              <Paper
                                key={`${p.userId ?? 'sin-usuario'}-${idx}`}
                                variant="outlined"
                                sx={{
                                  px: 2,
                                  py: 1.5,
                                  borderRadius: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1.5,
                                  borderColor: p.confirmed
                                    ? 'success.main'
                                    : 'divider',
                                  bgcolor: p.confirmed
                                    ? theme =>
                                        alpha(theme.palette.success.main, 0.06)
                                    : 'background.paper'
                                }}
                              >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                    title={p.displayName}
                                    sx={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {p.displayName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      fontFamily: 'monospace',
                                      fontVariantNumeric: 'tabular-nums'
                                    }}
                                  >
                                    {p.popId}
                                  </Typography>
                                  {!p.userId ? (
                                    <Stack
                                      direction="row"
                                      spacing={0.75}
                                      alignItems="center"
                                      flexWrap="wrap"
                                      useFlexGap
                                      sx={{ mt: 0.75 }}
                                    >
                                      <Chip
                                        size="small"
                                        label="Sin cuenta"
                                        color="warning"
                                        variant="outlined"
                                      />
                                      {p.popId && p.popId !== '—' ? (
                                        <Button
                                          size="small"
                                          variant="text"
                                          color="warning"
                                          disabled={linkByPop.isPending}
                                          onClick={async () => {
                                            try {
                                              const result =
                                                await linkByPop.mutateAsync({
                                                  eventId: ev._id,
                                                  popId: p.popId
                                                })
                                              if (!result.alreadyLinked) {
                                                await refetch()
                                              }
                                            } catch {
                                              /* error en estado del hook */
                                            }
                                          }}
                                          sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            minHeight: 28,
                                            fontSize: '0.75rem'
                                          }}
                                        >
                                          Vincular POP
                                        </Button>
                                      ) : null}
                                    </Stack>
                                  ) : null}
                                </Box>
                                <Button
                                  size="small"
                                  variant={p.confirmed ? 'contained' : 'outlined'}
                                  color={p.confirmed ? 'success' : 'inherit'}
                                  disabled={
                                    !canConfirm ||
                                    confirmParticipation.isPending
                                  }
                                  startIcon={
                                    <CheckCircle sx={{ fontSize: 18 }} />
                                  }
                                  onClick={async () => {
                                    if (!p.userId) return
                                    try {
                                      await confirmParticipation.mutateAsync({
                                        eventId: ev._id,
                                        userId: p.userId,
                                        confirmed: !p.confirmed
                                      })
                                    } catch {
                                      /* error en estado */
                                    }
                                  }}
                                  sx={{
                                    flexShrink: 0,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    minWidth: { xs: 108, sm: 120 }
                                  }}
                                >
                                  {p.confirmed ? 'Asistió' : 'Confirmar'}
                                </Button>
                              </Paper>
                            )
                          })}
                        </Stack>
                      )}
                    </Stack>
                  ) : null}
                </Box>

                {showTdfTab ? (
                  <Box
                    role="tabpanel"
                    hidden={tab !== 1}
                    id="event-tabpanel-tdf"
                    aria-labelledby="event-tab-tdf"
                    sx={{ p: { xs: 2, sm: 2.5 } }}
                  >
                    {tab === 1 ? (
                      <Stack spacing={2.5}>
                        <AdminEventTdfWorkflowGuide />
                        <TournamentTdfLoader
                          showIntro={false}
                          eventId={ev._id}
                          registeredPopIds={registeredPopIdsForTdf}
                          syncedRoundNums={syncedRoundNumsForTdf}
                          savedRoundSnapshots={ev.roundSnapshots ?? []}
                          eventRoundNum={ev.roundNum ?? 0}
                        />
                      </Stack>
                    ) : null}
                  </Box>
                ) : null}
              </Paper>

              <Dialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                fullWidth
                maxWidth="sm"
                aria-labelledby="event-settings-title"
              >
                <DialogTitle id="event-settings-title">
                  Liga del torneo
                </DialogTitle>
                <DialogContent dividers>
                  <Stack spacing={2} sx={{ pt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Solo afecta puntos de liga cuando el torneo está cerrado y
                      tiene clasificación guardada.
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel id="event-league-select-label">
                        Liga
                      </InputLabel>
                      <Select
                        labelId="event-league-select-label"
                        label="Liga"
                        value={leagueIdInput}
                        onChange={e => setLeagueIdInput(String(e.target.value))}
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
                    {updateEv.isError && updateEv.error instanceof Error ? (
                      <Alert severity="error">{updateEv.error.message}</Alert>
                    ) : null}
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setSettingsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => void saveLeagueAssignment()}
                    disabled={updateEv.isPending}
                  >
                    Guardar
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  )
}

function StatTile({
  label,
  value,
  sx
}: {
  label: string
  value: string
  sx?: object
}) {
  return (
    <Box
      sx={[
        {
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: theme =>
            `0 1px 0 ${alpha(theme.palette.primary.main, 0.06)}`,
          borderTop: '2px solid',
          borderTopColor: 'primary.main'
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        sx={{ letterSpacing: '0.02em' }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          mt: 0.35,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
