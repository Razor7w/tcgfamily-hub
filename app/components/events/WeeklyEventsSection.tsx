'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import {
  EmojiEvents,
  GridView,
  Groups,
  Leaderboard,
  LocalActivity,
  PersonOutline,
  Place,
  TableRestaurant,
  Verified
} from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  PublicWeeklyEvent,
  useEventCurrentRound,
  useRegisterWeeklyEvent,
  useUnregisterWeeklyEvent,
  useWeeklyEventFullStandings,
  useWeekEvents
} from '@/hooks/useWeeklyEvents'
import WeekRangeNavigator from '@/components/events/WeekRangeNavigator'
import {
  localDayKey,
  mondayIndexFromDate,
  sameLocalDay,
  startOfWeekMonday
} from '@/components/events/weekUtils'
import LinearCapacity from '@/components/events/LinearCapacity'
import TournamentFinishedStandingsTabs from '@/components/events/TournamentFinishedStandingsTabs'
import WeeklyEventPreRegisterForm from '@/components/events/WeeklyEventPreRegisterForm'
import {
  formatCloseNote,
  formatPrice,
  formatWhen,
  gameLabel,
  isUnlimitedWeeklyCapacity,
  kindLabel,
  pokemonSubtypeLabel
} from '@/components/events/weeklyEventsSectionUtils'
import WeeklyEventsSectionSkeleton from '@/components/events/WeeklyEventsSectionSkeleton'
import WeeklyEventsSectionHeader from '@/components/events/WeeklyEventsSectionHeader'
import WeeklyEventsDayStrip from '@/components/events/WeeklyEventsDayStrip'
import WeeklyEventsOtherDaysEmptyPanel from '@/components/events/WeeklyEventsOtherDaysEmptyPanel'
import WeeklyEventsWeekEmptyPanel from '@/components/events/WeeklyEventsWeekEmptyPanel'
import WeeklyEventsSameDayEventChips from '@/components/events/WeeklyEventsSameDayEventChips'
import WeeklyParticipantsDialog from '@/components/events/WeeklyParticipantsDialog'
import WeeklyFullStandingsDialog from '@/components/events/WeeklyFullStandingsDialog'
import WeeklyCurrentRoundDialog from '@/components/events/WeeklyCurrentRoundDialog'

type WeeklyEventsSectionProps = {
  showSeeAllLink?: boolean
  /** Semana controlada por el padre (p. ej. dashboard + reporte de torneos). */
  weekAnchor?: Date
  onWeekAnchorChange?: (next: Date) => void
}

export default function WeeklyEventsSection({
  showSeeAllLink = true,
  weekAnchor: weekAnchorProp,
  onWeekAnchorChange
}: WeeklyEventsSectionProps) {
  const theme = useTheme()
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))
  const { data: session } = useSession()
  const [internalWeekAnchor, setInternalWeekAnchor] = useState(() => new Date())
  const isWeekControlled =
    weekAnchorProp !== undefined && typeof onWeekAnchorChange === 'function'
  const weekAnchor = isWeekControlled ? weekAnchorProp! : internalWeekAnchor
  const setWeekAnchor = useCallback(
    (updater: Date | ((prev: Date) => Date)) => {
      const next =
        typeof updater === 'function'
          ? (updater as (prev: Date) => Date)(weekAnchor)
          : updater
      if (isWeekControlled) {
        onWeekAnchorChange!(next)
      } else {
        setInternalWeekAnchor(next)
      }
    },
    [weekAnchor, isWeekControlled, onWeekAnchorChange]
  )
  const weekStart = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor])

  const [selectedOffset, setSelectedOffset] = useState(() =>
    mondayIndexFromDate(new Date())
  )

  /** Refs a cada botón del carrusel de días para hacer scroll horizontal al día seleccionado (móvil). */
  const dayPickerButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  /** Contenedor con `overflow-x: auto`; fin de semana se lleva al final del scroll. */
  const dayPickerStripRef = useRef<HTMLDivElement | null>(null)

  const { data, isPending, isError, error, refetch } = useWeekEvents(weekAnchor)
  const register = useRegisterWeeklyEvent()
  const unregister = useUnregisterWeeklyEvent()

  const events = useMemo(() => data?.events ?? [], [data?.events])

  const eventsWeekSorted = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
  }, [events])

  const selectedDate = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + selectedOffset)
    return d
  }, [weekStart, selectedOffset])

  const eventsForDay = useMemo(() => {
    return events.filter(e => sameLocalDay(new Date(e.startsAt), selectedDate))
  }, [events, selectedDate])

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const selectedEvent = useMemo(() => {
    if (!eventsForDay.length) return null
    if (selectedEventId != null) {
      const match = eventsForDay.find(e => e._id === selectedEventId)
      if (match) return match
    }
    return eventsForDay[0] ?? null
  }, [eventsForDay, selectedEventId])

  /** Oculta bloques de preinscripción cuando el evento ya está en curso o cerrado (admin marca `running` al setear ronda, etc.). */
  const selectedEventStarted =
    selectedEvent != null &&
    (selectedEvent.state === 'running' || selectedEvent.state === 'close')

  const [participantsOpenForEventId, setParticipantsOpenForEventId] = useState<
    string | null
  >(null)
  const participantsModalOpen =
    participantsOpenForEventId !== null &&
    !!selectedEvent &&
    participantsOpenForEventId === selectedEvent._id

  const [fullStandingsOpenForEventId, setFullStandingsOpenForEventId] =
    useState<string | null>(null)
  const fullStandingsModalOpen =
    fullStandingsOpenForEventId !== null &&
    !!selectedEvent &&
    fullStandingsOpenForEventId === selectedEvent._id

  const fullStandingsQuery = useWeeklyEventFullStandings(
    fullStandingsModalOpen ? selectedEvent._id : null,
    fullStandingsModalOpen
  )

  const [currentRoundOpenForEventId, setCurrentRoundOpenForEventId] = useState<
    string | null
  >(null)
  const currentRoundModalOpen =
    currentRoundOpenForEventId !== null &&
    !!selectedEvent &&
    currentRoundOpenForEventId === selectedEvent._id

  const currentRoundQuery = useEventCurrentRound(
    currentRoundModalOpen ? selectedEvent._id : null,
    currentRoundModalOpen
  )

  const dayKeys = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return localDayKey(d)
    })
  }, [weekStart])

  const countsByDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const ev of events) {
      const k = localDayKey(new Date(ev.startsAt))
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [events])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const strip = dayPickerStripRef.current
      if (!strip) return

      if (selectedOffset >= 5) {
        strip.scrollTo({
          left: Math.max(0, strip.scrollWidth - strip.clientWidth),
          behavior: 'smooth'
        })
        return
      }
    })
    return () => cancelAnimationFrame(id)
  }, [selectedOffset, weekStart])

  const registerDisabledReason = (ev: PublicWeeklyEvent | null) => {
    if (!ev) return 'No hay evento seleccionado'
    if (ev.myRegistration) return null
    if (!ev.canPreRegister) return 'La preinscripción ya cerró'
    if (ev.participantCount >= ev.maxParticipants) return 'Cupo completo'
    return null
  }

  const regReason = registerDisabledReason(selectedEvent)

  const selectedUnlimitedCapacity = selectedEvent
    ? isUnlimitedWeeklyCapacity(selectedEvent.maxParticipants)
    : false

  const fillPct = selectedEvent
    ? Math.min(
        100,
        Math.round(
          (selectedEvent.participantCount / selectedEvent.maxParticipants) * 100
        )
      )
    : 0

  return (
    <Card
      component="section"
      elevation={0}
      sx={{
        borderRadius: { xs: 3, sm: 4 },
        border: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.08),
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: '0 20px 40px -20px rgba(24, 24, 27, 0.12)'
      }}
    >
      <WeeklyEventsSectionHeader showSeeAllLink={showSeeAllLink} />

      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.5 },
          '&:last-child': { pb: { xs: 2.5, sm: 3 } }
        }}
      >
        <Box sx={{ mb: 2 }}>
          <WeekRangeNavigator
            weekAnchor={weekAnchor}
            onWeekAnchorChange={d => setWeekAnchor(d)}
          />
        </Box>

        <WeeklyEventsDayStrip
          stripRef={dayPickerStripRef}
          dayPickerButtonRefs={dayPickerButtonRefs}
          dayKeys={dayKeys}
          weekStart={weekStart}
          selectedOffset={selectedOffset}
          onSelectOffset={setSelectedOffset}
          countsByDay={countsByDay}
        />

        {isPending ? (
          <WeeklyEventsSectionSkeleton />
        ) : isError ? (
          <Alert
            severity="error"
            variant="outlined"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          >
            {error instanceof Error
              ? error.message
              : 'No se pudieron cargar los eventos'}
          </Alert>
        ) : !eventsForDay.length && events.length > 0 ? (
          <WeeklyEventsOtherDaysEmptyPanel
            eventsWeekSorted={eventsWeekSorted}
            weekStart={weekStart}
            onPickEvent={(dayOffset, eventId) => {
              setSelectedOffset(dayOffset)
              setSelectedEventId(eventId)
            }}
          />
        ) : !eventsForDay.length ? (
          <WeeklyEventsWeekEmptyPanel />
        ) : (
          <>
            <WeeklyEventsSameDayEventChips
              eventsForDay={eventsForDay}
              selectedEventId={selectedEvent?._id ?? null}
              onSelectEventId={setSelectedEventId}
            />

            {selectedEvent ? (
              <>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  gap={2}
                  sx={{ mb: 2 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ letterSpacing: '0.12em', fontWeight: 700 }}
                    >
                      Horario
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        lineHeight: 1.35,
                        letterSpacing: '-0.02em',
                        mt: 0.25
                      }}
                    >
                      {formatWhen(selectedEvent.startsAt)}
                    </Typography>
                  </Box>
                  {!selectedUnlimitedCapacity ? (
                    <Chip
                      icon={<Groups sx={{ fontSize: '18px !important' }} />}
                      label={`${selectedEvent.participantCount}/${selectedEvent.maxParticipants}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                        borderRadius: 2,
                        borderColor: t => alpha(t.palette.text.primary, 0.16)
                      }}
                    />
                  ) : null}
                </Stack>

                {!selectedUnlimitedCapacity ? (
                  <LinearCapacity value={fillPct} />
                ) : null}

                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems="stretch"
                  sx={{ mt: 2.5 }}
                >
                  <Box sx={{ flex: isMdUp ? 7 : undefined, minWidth: 0 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        borderColor: t => alpha(t.palette.text.primary, 0.1),
                        bgcolor: t => alpha(t.palette.text.primary, 0.02),
                        boxShadow: 'none'
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        <Typography
                          variant="overline"
                          color="primary"
                          sx={{ fontWeight: 800, letterSpacing: '0.1em' }}
                        >
                          Detalle del evento
                        </Typography>
                        <Stack spacing={1.75} sx={{ mt: 1 }}>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="flex-start"
                          >
                            <EmojiEvents
                              sx={{
                                color: 'warning.main',
                                mt: 0.25,
                                flexShrink: 0
                              }}
                            />
                            <Typography
                              variant="h6"
                              component="h3"
                              sx={{ fontWeight: 700, lineHeight: 1.3 }}
                            >
                              {selectedEvent.title}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {formatWhen(selectedEvent.startsAt)}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              size="small"
                              label={gameLabel(selectedEvent.game)}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={kindLabel(selectedEvent.kind)}
                              variant="outlined"
                            />
                            {selectedEvent.kind === 'tournament' &&
                            selectedEvent.game === 'pokemon' &&
                            selectedEvent.pokemonSubtype ? (
                              <Chip
                                size="small"
                                label={pokemonSubtypeLabel(
                                  selectedEvent.pokemonSubtype
                                )}
                                color="primary"
                                variant="outlined"
                              />
                            ) : null}
                            {selectedEvent.kind === 'tournament' &&
                            selectedEvent.league &&
                            selectedEvent.league.slug ? (
                              <Chip
                                component={Link}
                                href={`/ligas/${encodeURIComponent(selectedEvent.league.slug)}`}
                                scroll={false}
                                clickable
                                size="small"
                                icon={
                                  <Leaderboard
                                    sx={{
                                      fontSize: '16px !important',
                                      color: 'secondary.main'
                                    }}
                                  />
                                }
                                label={selectedEvent.league.name}
                                title={`Ver clasificación de la liga: ${selectedEvent.league.name}`}
                                aria-label={`Abrir liga ${selectedEvent.league.name}`}
                                variant="outlined"
                                sx={{
                                  maxWidth: { xs: '100%', sm: 240 },
                                  fontWeight: 700,
                                  borderColor: t =>
                                    alpha(t.palette.secondary.main, 0.45),
                                  color: 'secondary.main',
                                  bgcolor: t =>
                                    alpha(t.palette.secondary.main, 0.06),
                                  transition: t =>
                                    t.transitions.create(
                                      [
                                        'background-color',
                                        'border-color',
                                        'box-shadow'
                                      ],
                                      {
                                        duration:
                                          t.transitions.duration.shortest
                                      }
                                    ),
                                  '&:hover': {
                                    bgcolor: t =>
                                      alpha(t.palette.secondary.main, 0.12),
                                    borderColor: 'secondary.main',
                                    boxShadow: t =>
                                      `0 1px 4px ${alpha(t.palette.secondary.main, 0.25)}`
                                  },
                                  '&:focus-visible': {
                                    outline: '2px solid',
                                    outlineColor: 'secondary.main',
                                    outlineOffset: 2
                                  },
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    px: 0.5
                                  }
                                }}
                              />
                            ) : null}
                            {selectedEvent.kind === 'tournament' &&
                            selectedEvent.roundNum > 0 ? (
                              <Chip
                                size="small"
                                label={`Ronda ${selectedEvent.roundNum}`}
                                variant="outlined"
                                sx={{
                                  borderColor: t =>
                                    alpha(t.palette.text.primary, 0.2),
                                  color: 'text.secondary',
                                  fontVariantNumeric: 'tabular-nums'
                                }}
                              />
                            ) : null}
                          </Stack>
                          {selectedEvent.formatNotes ? (
                            <Typography
                              variant="body2"
                              sx={{ lineHeight: 1.6 }}
                            >
                              {selectedEvent.formatNotes}
                            </Typography>
                          ) : null}
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <LocalActivity fontSize="small" color="action" />
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              color="text.primary"
                            >
                              {formatPrice(selectedEvent)}
                            </Typography>
                          </Stack>
                          {selectedEvent.prizesNotes ? (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="flex-start"
                            >
                              <EmojiEvents
                                fontSize="small"
                                color="action"
                                sx={{ mt: 0.35, flexShrink: 0 }}
                              />
                              <Typography
                                variant="body2"
                                sx={{ lineHeight: 1.55 }}
                              >
                                {selectedEvent.prizesNotes}
                              </Typography>
                            </Stack>
                          ) : null}
                          {selectedEvent.location ? (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="flex-start"
                            >
                              <Place
                                fontSize="small"
                                color="action"
                                sx={{ mt: 0.35, flexShrink: 0 }}
                              />
                              <Typography
                                variant="body2"
                                sx={{ lineHeight: 1.55 }}
                              >
                                {selectedEvent.location}
                              </Typography>
                            </Stack>
                          ) : null}
                          {selectedEvent.state !== 'close' ? (
                            <Box
                              sx={{
                                mt: 0.5,
                                p: 1.5,
                                borderRadius: 2.5,
                                bgcolor: t =>
                                  alpha(t.palette.primary.main, 0.06),
                                border: '1px solid',
                                borderColor: t =>
                                  alpha(t.palette.primary.main, 0.18),
                                boxShadow: t =>
                                  `inset 0 1px 0 ${alpha(t.palette.common.white, 0.5)}`
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ lineHeight: 1.55 }}
                              >
                                Preinscripción hasta las{' '}
                                <strong>
                                  {formatCloseNote(selectedEvent.startsAt)}
                                </strong>{' '}
                                (cierra 1 s antes del inicio).
                              </Typography>
                            </Box>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box sx={{ flex: isMdUp ? 5 : undefined, minWidth: 0 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        borderColor: t => alpha(t.palette.primary.main, 0.22),
                        bgcolor: t => alpha(t.palette.primary.main, 0.04),
                        boxShadow: t =>
                          `inset 0 1px 0 ${alpha(t.palette.common.white, 0.55)}`
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        {selectedEvent.kind === 'tournament' &&
                        selectedEvent.state === 'close' ? (
                          <Stack spacing={2.5}>
                            <Box>
                              <Typography
                                variant="overline"
                                color="primary"
                                sx={{
                                  fontWeight: 800,
                                  letterSpacing: '0.08em'
                                }}
                              >
                                Clasificación final
                              </Typography>
                            </Box>
                            {selectedEvent.myRegistration ? (
                              <Typography variant="body2">
                                Lista como{' '}
                                <Box
                                  component="strong"
                                  sx={{ color: 'text.primary' }}
                                >
                                  {selectedEvent.myRegistration}
                                </Box>
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                No estás inscrito en este torneo con tu cuenta.
                              </Typography>
                            )}
                            {selectedEvent.myRegistration ? (
                              <Stack
                                spacing={1.25}
                                sx={{
                                  py: 1.25,
                                  px: 1.5,
                                  borderRadius: 2,
                                  bgcolor: t =>
                                    alpha(t.palette.success.main, 0.06),
                                  border: 1,
                                  borderColor: t =>
                                    alpha(t.palette.success.main, 0.28)
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <EmojiEvents
                                    fontSize="small"
                                    color="success"
                                  />
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    fontWeight={700}
                                  >
                                    Tu resultado
                                  </Typography>
                                </Stack>
                                {selectedEvent.myTournamentPlacement ? (
                                  <Typography variant="body2">
                                    {selectedEvent.myTournamentPlacement
                                      .isDnf ? (
                                      <>
                                        Clasificación en{' '}
                                        <strong>
                                          {
                                            selectedEvent.myTournamentPlacement
                                              .categoryLabel
                                          }
                                        </strong>
                                        :{' '}
                                        <Box component="span" fontWeight={700}>
                                          DNF (no terminó)
                                        </Box>
                                      </>
                                    ) : (
                                      <>
                                        Puesto{' '}
                                        <strong>
                                          {
                                            selectedEvent.myTournamentPlacement
                                              .place
                                          }
                                          º
                                        </strong>{' '}
                                        en categoría{' '}
                                        <strong>
                                          {
                                            selectedEvent.myTournamentPlacement
                                              .categoryLabel
                                          }
                                        </strong>
                                      </>
                                    )}
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    No figuras en la clasificación publicada
                                    (revisa que tu POP ID coincida con el del
                                    torneo).
                                  </Typography>
                                )}
                                {selectedEvent.myMatchRecord ? (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Récord final (W / L / T):{' '}
                                    <Box
                                      component="span"
                                      fontWeight={700}
                                      color="text.primary"
                                    >
                                      {selectedEvent.myMatchRecord.wins} /{' '}
                                      {selectedEvent.myMatchRecord.losses} /{' '}
                                      {selectedEvent.myMatchRecord.ties}
                                    </Box>
                                  </Typography>
                                ) : null}
                              </Stack>
                            ) : null}
                            {selectedEvent.standingsTopByCategory &&
                            selectedEvent.standingsTopByCategory.length > 0 ? (
                              <TournamentFinishedStandingsTabs
                                key={selectedEvent._id}
                                categories={
                                  selectedEvent.standingsTopByCategory
                                }
                              />
                            ) : (
                              <Alert severity="info" variant="outlined">
                                La clasificación detallada aún no está publicada
                                para este evento.
                              </Alert>
                            )}
                            <Button
                              type="button"
                              variant="outlined"
                              color="inherit"
                              fullWidth
                              size="medium"
                              startIcon={<EmojiEvents />}
                              onClick={() =>
                                setFullStandingsOpenForEventId(
                                  selectedEvent._id
                                )
                              }
                            >
                              Ver standing completo
                            </Button>
                          </Stack>
                        ) : (
                          <>
                            {!selectedEventStarted ? (
                              <>
                                <Typography
                                  variant="overline"
                                  color="primary"
                                  sx={{ fontWeight: 700 }}
                                >
                                  Tu inscripción
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, mb: 2 }}
                                >
                                  Un nombre público en la lista. Puedes ver
                                  quién más va.
                                </Typography>
                              </>
                            ) : null}
                            {regReason ? (
                              <Alert
                                severity="info"
                                variant="outlined"
                                sx={{ mb: 2 }}
                              >
                                {regReason}
                              </Alert>
                            ) : null}
                            {selectedEvent.myRegistration ? (
                              <Stack spacing={2} sx={{ mb: 1 }}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                  flexWrap="wrap"
                                >
                                  <Typography variant="body2" component="span">
                                    Lista como{' '}
                                    <Box
                                      component="strong"
                                      sx={{ color: 'text.primary' }}
                                    >
                                      {selectedEvent.myRegistration}
                                    </Box>
                                  </Typography>
                                </Stack>
                                {selectedEvent.kind === 'tournament' &&
                                selectedEvent.state === 'running' ? (
                                  <>
                                    <Stack
                                      spacing={1}
                                      sx={{
                                        py: 1.25,
                                        px: 1.5,
                                        borderRadius: 2,
                                        bgcolor: t =>
                                          alpha(t.palette.secondary.main, 0.06),
                                        border: 1,
                                        borderColor: t =>
                                          alpha(t.palette.secondary.main, 0.22)
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        fontWeight={700}
                                      >
                                        Emparejamiento
                                      </Typography>
                                      {selectedEvent.roundNum > 0 ? (
                                        <Typography variant="body2">
                                          Ronda{' '}
                                          <strong>
                                            {selectedEvent.roundNum}
                                          </strong>
                                        </Typography>
                                      ) : (
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Ronda aún no publicada
                                        </Typography>
                                      )}
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                      >
                                        <TableRestaurant
                                          fontSize="small"
                                          color="action"
                                        />
                                        <Typography variant="body2">
                                          Mesa{' '}
                                          <strong>
                                            {selectedEvent.myTable != null &&
                                            selectedEvent.myTable.trim() !== ''
                                              ? selectedEvent.myTable
                                              : '—'}
                                          </strong>
                                        </Typography>
                                      </Stack>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                      >
                                        <PersonOutline
                                          fontSize="small"
                                          color="action"
                                        />
                                        <Typography variant="body2">
                                          Oponente{' '}
                                          <strong>
                                            {selectedEvent.myOpponentName ??
                                              '—'}
                                          </strong>
                                        </Typography>
                                      </Stack>
                                      {selectedEvent.myMatchRecord ? (
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Récord (W / L / T):{' '}
                                          <Box
                                            component="span"
                                            fontWeight={700}
                                            color="text.primary"
                                          >
                                            {selectedEvent.myMatchRecord.wins} /{' '}
                                            {selectedEvent.myMatchRecord.losses}{' '}
                                            / {selectedEvent.myMatchRecord.ties}
                                          </Box>
                                        </Typography>
                                      ) : null}
                                    </Stack>
                                    <Button
                                      type="button"
                                      variant="outlined"
                                      color="secondary"
                                      fullWidth
                                      size="medium"
                                      sx={{ mt: 1 }}
                                      startIcon={<GridView aria-hidden />}
                                      onClick={() =>
                                        setCurrentRoundOpenForEventId(
                                          selectedEvent._id
                                        )
                                      }
                                    >
                                      Ver emparejamientos de la ronda
                                    </Button>
                                  </>
                                ) : null}
                                {selectedEvent.state !== 'running' &&
                                !(
                                  selectedEvent.kind === 'tournament' &&
                                  selectedEvent.state === 'close'
                                ) ? (
                                  <>
                                    {!selectedEventStarted &&
                                    selectedEvent.myAttendanceConfirmed ? (
                                      <Alert
                                        severity="success"
                                        variant="filled"
                                        icon={<Verified />}
                                        sx={{ alignItems: 'center' }}
                                      >
                                        <Typography
                                          variant="body2"
                                          fontWeight={600}
                                        >
                                          Asistencia confirmada por la tienda
                                        </Typography>
                                      </Alert>
                                    ) : selectedEvent.canUnregister ? (
                                      <Button
                                        type="button"
                                        variant="outlined"
                                        color="error"
                                        fullWidth
                                        size="large"
                                        disabled={unregister.isPending}
                                        onClick={async () => {
                                          if (!selectedEvent) return
                                          try {
                                            await unregister.mutateAsync(
                                              selectedEvent._id
                                            )
                                          } catch {
                                            /* error en estado */
                                          }
                                        }}
                                      >
                                        {unregister.isPending
                                          ? 'Quitando…'
                                          : 'Desinscribirse'}
                                      </Button>
                                    ) : (
                                      <Alert severity="info" variant="outlined">
                                        No puedes desinscribirte: el evento ya
                                        comenzó.
                                      </Alert>
                                    )}
                                    {unregister.isError ? (
                                      <Alert
                                        severity="error"
                                        variant="outlined"
                                      >
                                        {unregister.error instanceof Error
                                          ? unregister.error.message
                                          : 'Error'}
                                      </Alert>
                                    ) : null}
                                  </>
                                ) : null}
                              </Stack>
                            ) : (
                              <WeeklyEventPreRegisterForm
                                key={`${selectedEvent._id}-${session?.user?.name ?? ''}-${session?.user?.popid ?? ''}`}
                                selectedEvent={selectedEvent}
                                defaultName={session?.user?.name?.trim() ?? ''}
                                popId={session?.user?.popid ?? ''}
                                regReason={regReason}
                                register={register}
                              />
                            )}

                            {!selectedEventStarted ? (
                              <Button
                                type="button"
                                variant="outlined"
                                color="inherit"
                                fullWidth
                                size="medium"
                                sx={{ mt: 2 }}
                                startIcon={<Groups />}
                                onClick={() =>
                                  setParticipantsOpenForEventId(
                                    selectedEvent._id
                                  )
                                }
                              >
                                Ver lista de participantes
                                {selectedEvent.participantCount > 0
                                  ? ` (${selectedEvent.participantCount})`
                                  : ''}
                              </Button>
                            ) : null}
                          </>
                        )}

                        <WeeklyParticipantsDialog
                          open={participantsModalOpen}
                          onClose={() => setParticipantsOpenForEventId(null)}
                          eventTitle={selectedEvent.title}
                          participantNames={selectedEvent.participantNames}
                        />

                        <WeeklyFullStandingsDialog
                          open={fullStandingsModalOpen}
                          onClose={() => setFullStandingsOpenForEventId(null)}
                          eventTitle={selectedEvent.title}
                          eventId={selectedEvent._id}
                          fullStandingsQuery={fullStandingsQuery}
                        />

                        <WeeklyCurrentRoundDialog
                          open={currentRoundModalOpen}
                          onClose={() => setCurrentRoundOpenForEventId(null)}
                          eventTitle={selectedEvent.title}
                          currentRoundQuery={currentRoundQuery}
                        />
                      </CardContent>
                    </Card>
                  </Box>
                </Stack>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
