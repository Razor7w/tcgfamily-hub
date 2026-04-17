"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  EmojiEvents,
  EventAvailable,
  GridView,
  Groups,
  LocalActivity,
  OpenInNew,
  PersonOutline,
  Place,
  TableRestaurant,
  Verified,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  PublicWeeklyEvent,
  useEventCurrentRound,
  useRegisterWeeklyEvent,
  useUnregisterWeeklyEvent,
  useWeekEvents,
} from "@/hooks/useWeeklyEvents";
import {
  addWeeks,
  localDayKey,
  mondayIndexFromDate,
  sameLocalDay,
  startOfWeekMonday,
} from "@/components/events/weekUtils";
import { registrationClosesAt } from "@/lib/weekly-events";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function gameLabel(g: PublicWeeklyEvent["game"]) {
  if (g === "pokemon") return "Pokémon";
  if (g === "magic") return "Magic";
  return "Otro TCG";
}

function kindLabel(k: PublicWeeklyEvent["kind"]) {
  if (k === "tournament") return "Torneo";
  if (k === "trade_day") return "Intercambio";
  return "Evento";
}

function pokemonSubtypeLabel(
  s: NonNullable<PublicWeeklyEvent["pokemonSubtype"]>,
) {
  if (s === "casual") return "Casual";
  if (s === "cup") return "Cup";
  return "Challenge";
}

function formatPrice(ev: PublicWeeklyEvent) {
  if (ev.kind !== "tournament") return "—";
  if (ev.priceClp <= 0) return "Gratis";
  return `${ev.priceClp.toLocaleString("es-CL")} CLP`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const dayLong = d.toLocaleDateString("es-CL", { weekday: "long" });
  const dayCap = dayLong.charAt(0).toUpperCase() + dayLong.slice(1);
  const datePart = d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
  });
  const timePart = d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dayCap} ${datePart} · ${timePart}`;
}

function formatCloseNote(iso: string) {
  const t = registrationClosesAt(new Date(iso));
  return t.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatWlt(r: { wins: number; losses: number; ties: number }) {
  return `${r.wins} / ${r.losses} / ${r.ties}`;
}

function standingsTabLabel(categoryIndex: number): string {
  if (categoryIndex === 0) return "Júnior";
  if (categoryIndex === 1) return "Sénior";
  return "Máster";
}

/** Orden visual: Máster (2) → Sénior (1) → Júnior (0), de izquierda a derecha. */
function categoryTabSortKey(categoryIndex: number): number {
  if (categoryIndex === 2) return 0;
  if (categoryIndex === 1) return 1;
  if (categoryIndex === 0) return 2;
  return 9;
}

function sortStandingsCategoriesForTabs(
  categories: NonNullable<PublicWeeklyEvent["standingsTopByCategory"]>,
): NonNullable<PublicWeeklyEvent["standingsTopByCategory"]> {
  return [...categories].sort(
    (a, b) => categoryTabSortKey(a.categoryIndex) - categoryTabSortKey(b.categoryIndex),
  );
}

function TournamentFinishedStandingsTabs({
  categories,
}: {
  categories: NonNullable<PublicWeeklyEvent["standingsTopByCategory"]>;
}) {
  const ordered = useMemo(
    () => sortStandingsCategoriesForTabs(categories),
    [categories],
  );
  const [tabIndex, setTabIndex] = useState(0);
  const safeIndex = Math.min(tabIndex, Math.max(0, ordered.length - 1));
  const rows = ordered[safeIndex]?.rows ?? [];

  return (
    <Stack spacing={2}>
      <Tabs
        value={safeIndex}
        onChange={(_, v) => setTabIndex(v)}
        variant={ordered.length <= 4 ? "fullWidth" : "scrollable"}
        scrollButtons={ordered.length <= 4 ? false : "auto"}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          minHeight: 44,
          "& .MuiTab-root": { minHeight: 44, py: 1, fontWeight: 600 },
        }}
      >
        {ordered.map((c) => (
          <Tab key={c.categoryIndex} label={standingsTabLabel(c.categoryIndex)} />
        ))}
      </Tabs>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 2,
          maxHeight: { xs: "min(70vh, 520px)", sm: 520 },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={72}>Puesto</TableCell>
              <TableCell>Jugador</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={`${row.place}-${i}`}>
                <TableCell sx={{ fontWeight: 700 }}>{row.place}º</TableCell>
                <TableCell>{row.displayName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

type WeeklyEventsSectionProps = {
  showSeeAllLink?: boolean;
};

function WeeklyEventPreRegisterForm({
  selectedEvent,
  defaultName,
  popId,
  regReason,
  register,
}: {
  selectedEvent: PublicWeeklyEvent;
  defaultName: string;
  popId: string;
  regReason: string | null;
  register: ReturnType<typeof useRegisterWeeklyEvent>;
}) {
  const [nameInput, setNameInput] = useState(defaultName);
  const canSubmit =
    !regReason &&
    nameInput.trim().length > 0 &&
    !register.isPending &&
    !!selectedEvent;

  return (
    <Stack spacing={2} component="form" noValidate>
      <TextField
        label="Nombre en la lista"
        placeholder="Ej. Ana o tu apodo"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        fullWidth
        size="medium"
        disabled={!selectedEvent.canPreRegister}
        helperText={
          !selectedEvent.canPreRegister ? "Preinscripción cerrada para este horario" : undefined
        }
      />
      <Button
        type="button"
        variant="contained"
        size="large"
        fullWidth
        disabled={!canSubmit}
        onClick={async () => {
          if (!selectedEvent) return;
          try {
            await register.mutateAsync({
              eventId: selectedEvent._id,
              displayName: nameInput.trim(),
              popId: popId.trim(),
              table: "",
              opponentId: "",
            });
          } catch {
            /* error en estado */
          }
        }}
      >
        {register.isPending ? "Enviando…" : "Preinscribirme"}
      </Button>
      {register.isError ? (
        <Alert severity="error" variant="outlined">
          {register.error instanceof Error ? register.error.message : "Error"}
        </Alert>
      ) : null}
    </Stack>
  );
}

function SectionLoading() {
  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Skeleton variant="rounded" height={220} sx={{ flex: 1, borderRadius: 2 }} />
        <Skeleton variant="rounded" height={220} sx={{ flex: 1, borderRadius: 2 }} />
      </Stack>
    </Stack>
  );
}

export default function WeeklyEventsSection({
  showSeeAllLink = true,
}: WeeklyEventsSectionProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { data: session } = useSession();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const weekStart = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor]);

  const [selectedOffset, setSelectedOffset] = useState(() =>
    mondayIndexFromDate(new Date()),
  );

  const { data, isPending, isError, error, refetch } = useWeekEvents(weekAnchor);
  const register = useRegisterWeeklyEvent();
  const unregister = useUnregisterWeeklyEvent();

  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const todayKey = useMemo(() => localDayKey(new Date()), []);

  const selectedDate = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + selectedOffset);
    return d;
  }, [weekStart, selectedOffset]);

  const eventsForDay = useMemo(() => {
    return events.filter((e) => sameLocalDay(new Date(e.startsAt), selectedDate));
  }, [events, selectedDate]);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const selectedEvent = useMemo(() => {
    if (!eventsForDay.length) return null;
    if (selectedEventId != null) {
      const match = eventsForDay.find((e) => e._id === selectedEventId);
      if (match) return match;
    }
    return eventsForDay[0] ?? null;
  }, [eventsForDay, selectedEventId]);

  /** Oculta bloques de preinscripción cuando el evento ya está en curso o cerrado (admin marca `running` al setear ronda, etc.). */
  const selectedEventStarted =
    selectedEvent != null &&
    (selectedEvent.state === "running" || selectedEvent.state === "close");

  const [participantsOpenForEventId, setParticipantsOpenForEventId] = useState<string | null>(null);
  const participantsModalOpen =
    participantsOpenForEventId !== null &&
    !!selectedEvent &&
    participantsOpenForEventId === selectedEvent._id;

  const [currentRoundOpenForEventId, setCurrentRoundOpenForEventId] =
    useState<string | null>(null);
  const currentRoundModalOpen =
    currentRoundOpenForEventId !== null &&
    !!selectedEvent &&
    currentRoundOpenForEventId === selectedEvent._id;

  const [standingsOpenForEventId, setStandingsOpenForEventId] = useState<string | null>(null);
  const standingsModalOpen =
    standingsOpenForEventId !== null &&
    !!selectedEvent &&
    standingsOpenForEventId === selectedEvent._id;

  const currentRoundQuery = useEventCurrentRound(
    currentRoundModalOpen ? selectedEvent._id : null,
    currentRoundModalOpen,
  );

  const dayKeys = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return localDayKey(d);
    });
  }, [weekStart]);

  const countsByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const ev of events) {
      const k = localDayKey(new Date(ev.startsAt));
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [events]);

  const handlePrevWeek = () => {
    setWeekAnchor((a) => addWeeks(startOfWeekMonday(a), -1));
  };

  const handleNextWeek = () => {
    setWeekAnchor((a) => addWeeks(startOfWeekMonday(a), 1));
  };

  const registerDisabledReason = (ev: PublicWeeklyEvent | null) => {
    if (!ev) return "No hay evento seleccionado";
    if (ev.myRegistration) return null;
    if (!ev.canPreRegister) return "La preinscripción ya cerró";
    if (ev.participantCount >= ev.maxParticipants) return "Cupo completo";
    return null;
  };

  const regReason = registerDisabledReason(selectedEvent);

  const fillPct = selectedEvent
    ? Math.min(
        100,
        Math.round((selectedEvent.participantCount / selectedEvent.maxParticipants) * 100),
      )
    : 0;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          pt: { xs: 2, sm: 2.5 },
          pb: 1.5,
          background: (t) =>
            `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 100%)`,
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={1}
        >
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                color: "primary.main",
                flexShrink: 0,
              }}
            >
              <CalendarMonth aria-hidden />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                Eventos de la semana
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                Elige el día y el evento para ver detalles e inscribirte
              </Typography>
            </Box>
          </Stack>
          {showSeeAllLink ? (
            <Button
              component={Link}
              href="/dashboard/eventos"
              size="small"
              color="primary"
              endIcon={<OpenInNew sx={{ fontSize: 16 }} />}
              sx={{ flexShrink: 0, fontWeight: 600 }}
            >
              Vista completa
            </Button>
          ) : null}
        </Stack>
      </Box>

      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          pt: { xs: 1.5, sm: 2 },
          "&:last-child": { pb: { xs: 2, sm: 2.5 } },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
          <IconButton
            size="small"
            aria-label="Semana anterior"
            onClick={handlePrevWeek}
            sx={{ color: "text.secondary" }}
          >
            <ChevronLeft />
          </IconButton>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flex: 1, textAlign: "center", fontWeight: 500 }}
          >
            {weekStart.toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
            })}{" "}
            —{" "}
            {(() => {
              const end = new Date(weekStart);
              end.setDate(weekStart.getDate() + 6);
              return end.toLocaleDateString("es-CL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
            })()}
          </Typography>
          <IconButton
            size="small"
            aria-label="Semana siguiente"
            onClick={handleNextWeek}
            sx={{ color: "text.secondary" }}
          >
            <ChevronRight />
          </IconButton>
        </Stack>

        <Box
          component="nav"
          aria-label="Días de la semana"
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 1.5,
            mx: { xs: -0.5, sm: 0 },
            px: 0.5,
            scrollSnapType: "x proximity",
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              borderRadius: 3,
              bgcolor: "action.disabledBackground",
            },
          }}
        >
          {dayKeys.map((key, idx) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + idx);
            const count = countsByDay.get(key) ?? 0;
            const selected = idx === selectedOffset;
            const isToday = key === todayKey;
            return (
              <Button
                key={key}
                onClick={() => setSelectedOffset(idx)}
                variant={selected ? "contained" : "outlined"}
                color={selected ? "primary" : "inherit"}
                size="small"
                aria-pressed={selected}
                aria-current={selected ? "date" : undefined}
                sx={{
                  minWidth: 56,
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  py: 1.25,
                  flexDirection: "column",
                  lineHeight: 1.2,
                  borderRadius: 2,
                  borderWidth: isToday && !selected ? 2 : 1,
                  borderColor: isToday && !selected ? "primary.light" : undefined,
                  boxShadow: selected ? 2 : 0,
                }}
              >
                <Typography variant="caption" display="block" sx={{ opacity: 0.9 }}>
                  {WEEKDAY_SHORT[idx]}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {d.getDate()}
                </Typography>
                {count > 0 ? (
                  <Chip
                    label={count}
                    size="small"
                    color={selected ? "default" : "primary"}
                    variant={selected ? "filled" : "outlined"}
                    sx={{
                      mt: 0.5,
                      height: 20,
                      "& .MuiChip-label": { px: 0.75, fontSize: 10, fontWeight: 600 },
                    }}
                  />
                ) : null}
              </Button>
            );
          })}
        </Box>

        {isPending ? (
          <SectionLoading />
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
            {error instanceof Error ? error.message : "No se pudieron cargar los eventos"}
          </Alert>
        ) : !eventsForDay.length ? (
          <Stack
            alignItems="center"
            spacing={1.5}
            sx={{
              py: 5,
              px: 2,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
            }}
          >
            <EventAvailable sx={{ fontSize: 48, color: "text.disabled", opacity: 0.8 }} />
            <Typography color="text.secondary" align="center" fontWeight={500}>
              No hay eventos este día
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 280 }}>
              Prueba otro día de la barra superior o cambia de semana.
            </Typography>
          </Stack>
        ) : (
          <>
            {eventsForDay.length > 1 ? (
              <Stack
                direction="row"
                role="tablist"
                aria-label="Eventos del día"
                gap={1}
                flexWrap="wrap"
                sx={{ mb: 2 }}
              >
                {eventsForDay.map((ev) => {
                  const active = ev._id === selectedEvent?._id;
                  return (
                    <Chip
                      key={ev._id}
                      label={ev.title}
                      onClick={() => setSelectedEventId(ev._id)}
                      color={active ? "primary" : "default"}
                      variant={active ? "filled" : "outlined"}
                      sx={{ fontWeight: active ? 600 : 500 }}
                    />
                  );
                })}
              </Stack>
            ) : null}

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
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                      Horario
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.35 }}>
                      {formatWhen(selectedEvent.startsAt)}
                    </Typography>
                  </Box>
                  <Chip
                    icon={<Groups sx={{ fontSize: "18px !important" }} />}
                    label={`${selectedEvent.participantCount}/${selectedEvent.maxParticipants}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, flexShrink: 0 }}
                  />
                </Stack>

                <LinearCapacity value={fillPct} />

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems="stretch"
                  sx={{ mt: 2 }}
                >
                  <Box sx={{ flex: isMdUp ? 7 : undefined, minWidth: 0 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        borderRadius: 2,
                        bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                          Detalle del evento
                        </Typography>
                        <Stack spacing={1.75} sx={{ mt: 1 }}>
                          <Stack direction="row" spacing={1.25} alignItems="flex-start">
                            <EmojiEvents sx={{ color: "warning.main", mt: 0.25, flexShrink: 0 }} />
                            <Typography variant="h6" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                              {selectedEvent.title}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {formatWhen(selectedEvent.startsAt)}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={gameLabel(selectedEvent.game)} variant="outlined" />
                            <Chip size="small" label={kindLabel(selectedEvent.kind)} variant="outlined" />
                            {selectedEvent.kind === "tournament" &&
                            selectedEvent.game === "pokemon" &&
                            selectedEvent.pokemonSubtype ? (
                              <Chip
                                size="small"
                                label={pokemonSubtypeLabel(selectedEvent.pokemonSubtype)}
                                color="primary"
                                variant="outlined"
                              />
                            ) : null}
                            {selectedEvent.kind === "tournament" &&
                            selectedEvent.roundNum > 0 ? (
                              <Chip
                                size="small"
                                label={`Ronda ${selectedEvent.roundNum}`}
                                color="secondary"
                                variant="outlined"
                              />
                            ) : null}
                          </Stack>
                          {selectedEvent.formatNotes ? (
                            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                              {selectedEvent.formatNotes}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocalActivity fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight={700} color="text.primary">
                              {formatPrice(selectedEvent)}
                            </Typography>
                          </Stack>
                          {selectedEvent.prizesNotes ? (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <EmojiEvents fontSize="small" color="action" sx={{ mt: 0.35, flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                                {selectedEvent.prizesNotes}
                              </Typography>
                            </Stack>
                          ) : null}
                          {selectedEvent.location ? (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <Place fontSize="small" color="action" sx={{ mt: 0.35, flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                                {selectedEvent.location}
                              </Typography>
                            </Stack>
                          ) : null}
                          <Box
                            sx={{
                              mt: 0.5,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: (t) => alpha(t.palette.info.main, 0.08),
                              border: 1,
                              borderColor: (t) => alpha(t.palette.info.main, 0.2),
                            }}
                          >
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                              Preinscripción hasta las <strong>{formatCloseNote(selectedEvent.startsAt)}</strong>{" "}
                              (cierra 1 s antes del inicio).
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box sx={{ flex: isMdUp ? 5 : undefined, minWidth: 0 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        borderRadius: 2,
                        borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        {!selectedEventStarted ? (
                          <>
                            <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                              Tu inscripción
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                              Un nombre público en la lista. Puedes ver quién más va sin datos privados.
                            </Typography>
                          </>
                        ) : null}
                        {regReason ? (
                          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                            {regReason}
                          </Alert>
                        ) : null}
                        {selectedEvent.myRegistration ? (
                          <Stack spacing={2} sx={{ mb: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                              <Typography variant="body2" component="span">
                                Lista como{" "}
                                <Box component="strong" sx={{ color: "text.primary" }}>
                                  {selectedEvent.myRegistration}
                                </Box>
                              </Typography>
                            </Stack>
                            {selectedEvent.kind === "tournament" &&
                            selectedEvent.state === "close" ? (
                              <Stack spacing={2}>
                                <Stack
                                  spacing={1.25}
                                  sx={{
                                    py: 1.25,
                                    px: 1.5,
                                    borderRadius: 2,
                                    bgcolor: (t) => alpha(t.palette.success.main, 0.06),
                                    border: 1,
                                    borderColor: (t) => alpha(t.palette.success.main, 0.28),
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <EmojiEvents fontSize="small" color="success" />
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                      Resultado final
                                    </Typography>
                                  </Stack>
                                  {selectedEvent.myTournamentPlacement ? (
                                    <Typography variant="body2">
                                      {selectedEvent.myTournamentPlacement.isDnf ? (
                                        <>
                                          Clasificación en{" "}
                                          <strong>
                                            {selectedEvent.myTournamentPlacement.categoryLabel}
                                          </strong>
                                          :{" "}
                                          <Box component="span" fontWeight={700}>
                                            DNF (no terminó)
                                          </Box>
                                        </>
                                      ) : (
                                        <>
                                          Puesto{" "}
                                          <strong>
                                            {selectedEvent.myTournamentPlacement.place}º
                                          </strong>{" "}
                                          en categoría{" "}
                                          <strong>
                                            {selectedEvent.myTournamentPlacement.categoryLabel}
                                          </strong>
                                        </>
                                      )}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No figuras en la clasificación publicada (revisa que tu POP ID
                                      coincida con el del torneo).
                                    </Typography>
                                  )}
                                  {selectedEvent.myMatchRecord ? (
                                    <Typography variant="body2" color="text.secondary">
                                      Récord final (W / L / T):{" "}
                                      <Box
                                        component="span"
                                        fontWeight={700}
                                        color="text.primary"
                                      >
                                        {selectedEvent.myMatchRecord.wins} /{" "}
                                        {selectedEvent.myMatchRecord.losses} /{" "}
                                        {selectedEvent.myMatchRecord.ties}
                                      </Box>
                                    </Typography>
                                  ) : null}
                                </Stack>
                                {selectedEvent.standingsTopByCategory &&
                                selectedEvent.standingsTopByCategory.length > 0 ? (
                                  <Button
                                    type="button"
                                    variant="outlined"
                                    color="success"
                                    fullWidth
                                    size="medium"
                                    startIcon={<EmojiEvents />}
                                    onClick={() =>
                                      setStandingsOpenForEventId(selectedEvent._id)
                                    }
                                  >
                                    Ver standings
                                  </Button>
                                ) : (
                                  <Alert severity="info" variant="outlined">
                                    La clasificación detallada aún no está publicada para este
                                    evento.
                                  </Alert>
                                )}
                              </Stack>
                            ) : selectedEvent.kind === "tournament" ? (
                              <>
                                <Stack
                                  spacing={1}
                                  sx={{
                                    py: 1.25,
                                    px: 1.5,
                                    borderRadius: 2,
                                    bgcolor: (t) => alpha(t.palette.secondary.main, 0.06),
                                    border: 1,
                                    borderColor: (t) => alpha(t.palette.secondary.main, 0.22),
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    Emparejamiento
                                  </Typography>
                                  {selectedEvent.roundNum > 0 ? (
                                    <Typography variant="body2">
                                      Ronda <strong>{selectedEvent.roundNum}</strong>
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Ronda aún no publicada
                                    </Typography>
                                  )}
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <TableRestaurant fontSize="small" color="action" />
                                    <Typography variant="body2">
                                      Mesa{" "}
                                      <strong>
                                        {selectedEvent.myTable != null &&
                                        selectedEvent.myTable.trim() !== ""
                                          ? selectedEvent.myTable
                                          : "—"}
                                      </strong>
                                    </Typography>
                                  </Stack>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <PersonOutline fontSize="small" color="action" />
                                    <Typography variant="body2">
                                      Oponente{" "}
                                      <strong>
                                        {selectedEvent.myOpponentName ?? "—"}
                                      </strong>
                                    </Typography>
                                  </Stack>
                                  {selectedEvent.myMatchRecord ? (
                                    <Typography variant="body2" color="text.secondary">
                                      Récord (W / L / T):{" "}
                                      <Box
                                        component="span"
                                        fontWeight={700}
                                        color="text.primary"
                                      >
                                        {selectedEvent.myMatchRecord.wins} /{" "}
                                        {selectedEvent.myMatchRecord.losses} /{" "}
                                        {selectedEvent.myMatchRecord.ties}
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
                                    setCurrentRoundOpenForEventId(selectedEvent._id)
                                  }
                                >
                                  Ver emparejamientos de la ronda
                                </Button>
                              </>
                            ) : null}
                            {selectedEvent.state !== "running" &&
                            !(selectedEvent.kind === "tournament" && selectedEvent.state === "close") ? (
                              <>
                                {!selectedEventStarted && selectedEvent.myAttendanceConfirmed ? (
                                  <Alert
                                    severity="success"
                                    variant="filled"
                                    icon={<Verified />}
                                    sx={{ alignItems: "center" }}
                                  >
                                    <Typography variant="body2" fontWeight={600}>
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
                                      if (!selectedEvent) return;
                                      try {
                                        await unregister.mutateAsync(selectedEvent._id);
                                      } catch {
                                        /* error en estado */
                                      }
                                    }}
                                  >
                                    {unregister.isPending ? "Quitando…" : "Desinscribirse"}
                                  </Button>
                                ) : (
                                  <Alert severity="info" variant="outlined">
                                    No puedes desinscribirte: el evento ya comenzó.
                                  </Alert>
                                )}
                                {unregister.isError ? (
                                  <Alert severity="error" variant="outlined">
                                    {unregister.error instanceof Error
                                      ? unregister.error.message
                                      : "Error"}
                                  </Alert>
                                ) : null}
                              </>
                            ) : null}
                          </Stack>
                        ) : (
                          <WeeklyEventPreRegisterForm
                            key={`${selectedEvent._id}-${session?.user?.name ?? ""}-${session?.user?.popid ?? ""}`}
                            selectedEvent={selectedEvent}
                            defaultName={session?.user?.name?.trim() ?? ""}
                            popId={session?.user?.popid ?? ""}
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
                            onClick={() => setParticipantsOpenForEventId(selectedEvent._id)}
                          >
                            Ver lista de participantes
                            {selectedEvent.participantCount > 0
                              ? ` (${selectedEvent.participantCount})`
                              : ""}
                          </Button>
                        ) : null}

                        <Dialog
                          open={participantsModalOpen}
                          onClose={() => setParticipantsOpenForEventId(null)}
                          fullWidth
                          maxWidth="sm"
                          scroll="paper"
                          aria-labelledby="participants-dialog-title"
                        >
                          <DialogTitle id="participants-dialog-title">
                            Participantes
                          </DialogTitle>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ px: 3, pb: 0, mt: -1 }}
                          >
                            {selectedEvent.title}
                          </Typography>
                          <DialogContent dividers sx={{ pt: 2 }}>
                            <List dense disablePadding>
                              {selectedEvent.participantNames.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                  Todavía no hay nadie inscrito.
                                </Typography>
                              ) : (
                                selectedEvent.participantNames.map((n, i) => (
                                  <ListItem
                                    key={`${i}-${n}`}
                                    disableGutters
                                    sx={{
                                      borderRadius: 1,
                                      mb: 0.5,
                                      px: 1,
                                      py: 0.75,
                                      bgcolor: (t) =>
                                        i % 2 === 0 ? alpha(t.palette.text.primary, 0.04) : "transparent",
                                    }}
                                  >
                                    <ListItemText
                                      primary={`${i + 1}. ${n}`}
                                      primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                                    />
                                  </ListItem>
                                ))
                              )}
                            </List>
                            <Box
                              sx={{
                                mt: 2,
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: "action.hover",
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                Solo nombres públicos. Cierre de preinscripción:{" "}
                                <strong>{formatCloseNote(selectedEvent.startsAt)}</strong>.
                              </Typography>
                            </Box>
                          </DialogContent>
                          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                            <Button
                              variant="contained"
                              onClick={() => setParticipantsOpenForEventId(null)}
                            >
                              Listo
                            </Button>
                          </DialogActions>
                        </Dialog>

                        <Dialog
                          open={currentRoundModalOpen}
                          onClose={() => setCurrentRoundOpenForEventId(null)}
                          fullWidth
                          maxWidth="md"
                          scroll="paper"
                          aria-labelledby="current-round-dialog-title"
                        >
                          <DialogTitle id="current-round-dialog-title">
                            Ronda en curso
                          </DialogTitle>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ px: 3, pb: 0, mt: -1 }}
                          >
                            {selectedEvent.title}
                          </Typography>
                          <DialogContent dividers sx={{ pt: 2 }}>
                            {currentRoundQuery.isPending ? (
                              <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
                                <CircularProgress size={36} aria-label="Cargando ronda" />
                              </Stack>
                            ) : currentRoundQuery.isError ? (
                              <Alert severity="error" variant="outlined">
                                {currentRoundQuery.error instanceof Error
                                  ? currentRoundQuery.error.message
                                  : "No se pudo cargar la ronda"}
                              </Alert>
                            ) : currentRoundQuery.data ? (
                              <Stack spacing={2}>
                                <Typography variant="body2" color="text.secondary">
                                  Ronda <strong>{currentRoundQuery.data.roundNum}</strong>
                                  {currentRoundQuery.data.syncedAt
                                    ? ` · Publicada ${new Date(
                                        currentRoundQuery.data.syncedAt,
                                      ).toLocaleString("es-CL")}`
                                    : null}
                                </Typography>
                                {currentRoundQuery.data.roundNum === 0 ||
                                !currentRoundQuery.data.hasSnapshot ? (
                                  <Alert severity="info" variant="outlined">
                                    {currentRoundQuery.data.roundNum === 0
                                      ? "Todavía no hay una ronda en curso publicada para este torneo."
                                      : "La tienda aún no ha publicado los emparejamientos de esta ronda. Vuelve a intentar más tarde."}
                                  </Alert>
                                ) : (
                                  <TableContainer
                                    component={Paper}
                                    variant="outlined"
                                    sx={{ borderRadius: 2, maxHeight: { xs: 360, sm: 480 } }}
                                  >
                                    <Table size="small" stickyHeader>
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Mesa</TableCell>
                                          <TableCell>Jugador 1</TableCell>
                                          <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                            W / L / T
                                          </TableCell>
                                          <TableCell>Jugador 2</TableCell>
                                          <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                            W / L / T
                                          </TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {currentRoundQuery.data.pairings.map((row, idx) => (
                                          <TableRow key={`${row.tableNumber}-${idx}`}>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                              {row.tableNumber || "—"}
                                            </TableCell>
                                            <TableCell>
                                              {row.player1Name?.trim() || "—"}
                                              {row.isBye ? (
                                                <Typography
                                                  component="span"
                                                  variant="caption"
                                                  color="text.secondary"
                                                  sx={{ ml: 0.5 }}
                                                >
                                                  (bye)
                                                </Typography>
                                              ) : null}
                                            </TableCell>
                                            <TableCell align="center">
                                              {formatWlt(row.player1Record)}
                                            </TableCell>
                                            <TableCell>
                                              {row.isBye ? "—" : row.player2Name?.trim() || "—"}
                                            </TableCell>
                                            <TableCell align="center">
                                              {row.isBye ? "—" : formatWlt(row.player2Record)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                )}
                                {currentRoundQuery.data.skipped.length > 0 ? (
                                  <Alert severity="warning" variant="outlined">
                                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                                      Mesas no aplicadas en el sistema
                                    </Typography>
                                    <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.5}>
                                      {currentRoundQuery.data.skipped.map((s, i) => (
                                        <Typography
                                          component="li"
                                          key={`${s.tableNumber}-${i}`}
                                          variant="body2"
                                        >
                                          Mesa {s.tableNumber}: {s.reason}
                                        </Typography>
                                      ))}
                                    </Stack>
                                  </Alert>
                                ) : null}
                              </Stack>
                            ) : null}
                          </DialogContent>
                          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                            <Button
                              variant="contained"
                              onClick={() => setCurrentRoundOpenForEventId(null)}
                            >
                              Cerrar
                            </Button>
                          </DialogActions>
                        </Dialog>

                        <Dialog
                          open={standingsModalOpen}
                          onClose={() => setStandingsOpenForEventId(null)}
                          fullWidth
                          maxWidth="sm"
                          scroll="paper"
                          aria-labelledby="standings-dialog-title"
                        >
                          <DialogTitle id="standings-dialog-title">
                            Clasificación
                          </DialogTitle>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ px: 3, pb: 0, mt: -1 }}
                          >
                            {selectedEvent.title}
                          </Typography>
                          <DialogContent dividers sx={{ pt: 2 }}>
                            {selectedEvent.standingsTopByCategory &&
                            selectedEvent.standingsTopByCategory.length > 0 ? (
                              <TournamentFinishedStandingsTabs
                                key={selectedEvent._id}
                                categories={selectedEvent.standingsTopByCategory}
                              />
                            ) : null}
                          </DialogContent>
                          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                            <Button
                              variant="contained"
                              onClick={() => setStandingsOpenForEventId(null)}
                            >
                              Cerrar
                            </Button>
                          </DialogActions>
                        </Dialog>
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
  );
}

function LinearCapacity({ value }: { value: number }) {
  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Cupo
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {value}%
        </Typography>
      </Stack>
      <Box
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: (t) => alpha(t.palette.text.primary, 0.08),
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${value}%`,
            borderRadius: 3,
            bgcolor: (t) =>
              value >= 90 ? t.palette.warning.main : t.palette.primary.main,
            transition: "width 0.3s ease",
          }}
        />
      </Box>
    </Box>
  );
}
