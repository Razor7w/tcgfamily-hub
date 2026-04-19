"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
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
  EmojiEvents,
  EventAvailable,
  GridView,
  Groups,
  Leaderboard,
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
  useWeeklyEventFullStandings,
  useWeekEvents,
} from "@/hooks/useWeeklyEvents";
import WeekRangeNavigator from "@/components/events/WeekRangeNavigator";
import {
  localDayKey,
  mondayIndexFromDate,
  sameLocalDay,
  startOfWeekMonday,
} from "@/components/events/weekUtils";
import { registrationClosesAt } from "@/lib/weekly-events";
import { WEEKLY_EVENT_PARTICIPANTS_MAX } from "@/lib/parse-pasted-event-flyer";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function isUnlimitedWeeklyCapacity(maxParticipants: number): boolean {
  return maxParticipants >= WEEKLY_EVENT_PARTICIPANTS_MAX;
}

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
  /** En modal: una sola barra de scroll (tabla); en tarjeta: altura acotada como antes. */
  variant = "inline",
}: {
  categories: NonNullable<PublicWeeklyEvent["standingsTopByCategory"]>;
  variant?: "inline" | "dialog";
}) {
  const ordered = useMemo(
    () => sortStandingsCategoriesForTabs(categories),
    [categories],
  );
  const [tabIndex, setTabIndex] = useState(0);
  const safeIndex = Math.min(tabIndex, Math.max(0, ordered.length - 1));
  const rows = ordered[safeIndex]?.rows ?? [];

  return (
    <Stack
      spacing={2}
      sx={
        variant === "dialog"
          ? {
              flex: 1,
              minHeight: 0,
              maxHeight: "100%",
              overflow: "hidden",
            }
          : undefined
      }
    >
      <Tabs
        value={safeIndex}
        onChange={(_, v) => setTabIndex(v)}
        variant={ordered.length <= 4 ? "fullWidth" : "scrollable"}
        scrollButtons={ordered.length <= 4 ? false : "auto"}
        sx={{
          minHeight: 44,
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.text.primary, 0.03),
          px: 0.5,
          "& .MuiTab-root": {
            minHeight: 44,
            py: 1,
            fontWeight: 700,
            textTransform: "none",
            borderRadius: 1.5,
          },
          "& .MuiTabs-indicator": {
            height: 3,
            borderRadius: 1,
          },
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
          borderRadius: 2.5,
          borderColor: (t) => alpha(t.palette.text.primary, 0.1),
          ...(variant === "dialog"
            ? {
                flex: 1,
                minHeight: 0,
                maxHeight: { xs: "min(58vh, 520px)", sm: "min(62vh, 560px)" },
                overflow: "auto",
              }
            : {
                maxHeight: { xs: "min(70vh, 520px)", sm: 520 },
              }),
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
  /** Semana controlada por el padre (p. ej. dashboard + reporte de torneos). */
  weekAnchor?: Date;
  onWeekAnchorChange?: (next: Date) => void;
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
    <Stack spacing={2.5} sx={{ py: 0.5 }}>
      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, maxWidth: 360 }} />
      <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2 }} />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ flex: 1, borderRadius: 3, border: "1px solid", borderColor: "divider" }}
        />
        <Skeleton
          variant="rounded"
          height={280}
          sx={{ flex: 1, borderRadius: 3, border: "1px solid", borderColor: "divider" }}
        />
      </Stack>
    </Stack>
  );
}

export default function WeeklyEventsSection({
  showSeeAllLink = true,
  weekAnchor: weekAnchorProp,
  onWeekAnchorChange,
}: WeeklyEventsSectionProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { data: session } = useSession();
  const [internalWeekAnchor, setInternalWeekAnchor] = useState(() => new Date());
  const isWeekControlled =
    weekAnchorProp !== undefined && typeof onWeekAnchorChange === "function";
  const weekAnchor = isWeekControlled ? weekAnchorProp! : internalWeekAnchor;
  const setWeekAnchor = useCallback(
    (updater: Date | ((prev: Date) => Date)) => {
      const next =
        typeof updater === "function"
          ? (updater as (prev: Date) => Date)(weekAnchor)
          : updater;
      if (isWeekControlled) {
        onWeekAnchorChange!(next);
      } else {
        setInternalWeekAnchor(next);
      }
    },
    [weekAnchor, isWeekControlled, onWeekAnchorChange],
  );
  const weekStart = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor]);

  const [selectedOffset, setSelectedOffset] = useState(() =>
    mondayIndexFromDate(new Date()),
  );

  /** Refs a cada botón del carrusel de días para hacer scroll horizontal al día seleccionado (móvil). */
  const dayPickerButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /** Contenedor con `overflow-x: auto`; fin de semana se lleva al final del scroll. */
  const dayPickerStripRef = useRef<HTMLDivElement | null>(null);

  const { data, isPending, isError, error, refetch } = useWeekEvents(weekAnchor);
  const register = useRegisterWeeklyEvent();
  const unregister = useUnregisterWeeklyEvent();

  const events = useMemo(() => data?.events ?? [], [data?.events]);

  const eventsWeekSorted = useMemo(() => {
    return [...events].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [events]);

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

  const [fullStandingsOpenForEventId, setFullStandingsOpenForEventId] =
    useState<string | null>(null);
  const fullStandingsModalOpen =
    fullStandingsOpenForEventId !== null &&
    !!selectedEvent &&
    fullStandingsOpenForEventId === selectedEvent._id;

  const fullStandingsQuery = useWeeklyEventFullStandings(
    fullStandingsModalOpen ? selectedEvent._id : null,
    fullStandingsModalOpen,
  );

  const [currentRoundOpenForEventId, setCurrentRoundOpenForEventId] =
    useState<string | null>(null);
  const currentRoundModalOpen =
    currentRoundOpenForEventId !== null &&
    !!selectedEvent &&
    currentRoundOpenForEventId === selectedEvent._id;

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

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const strip = dayPickerStripRef.current;
      if (!strip) return;

      if (selectedOffset >= 5) {
        strip.scrollTo({
          left: Math.max(0, strip.scrollWidth - strip.clientWidth),
          behavior: "smooth",
        });
        return;
      }

      const btn = dayPickerButtonRefs.current[selectedOffset];
      if (!btn) return;
      btn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedOffset, weekStart]);

  const registerDisabledReason = (ev: PublicWeeklyEvent | null) => {
    if (!ev) return "No hay evento seleccionado";
    if (ev.myRegistration) return null;
    if (!ev.canPreRegister) return "La preinscripción ya cerró";
    if (ev.participantCount >= ev.maxParticipants) return "Cupo completo";
    return null;
  };

  const regReason = registerDisabledReason(selectedEvent);

  const selectedUnlimitedCapacity = selectedEvent
    ? isUnlimitedWeeklyCapacity(selectedEvent.maxParticipants)
    : false;

  const fillPct = selectedEvent
    ? Math.min(
        100,
        Math.round((selectedEvent.participantCount / selectedEvent.maxParticipants) * 100),
      )
    : 0;

  return (
    <Card
      component="section"
      elevation={0}
      sx={{
        borderRadius: { xs: 3, sm: 4 },
        border: "1px solid",
        borderColor: (t) => alpha(t.palette.text.primary, 0.08),
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: "0 20px 40px -20px rgba(24, 24, 27, 0.12)",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pt: { xs: 2.5, sm: 3 },
          pb: { xs: 2, sm: 2.25 },
          borderBottom: "1px solid",
          borderColor: (t) => alpha(t.palette.text.primary, 0.06),
          bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "flex-start" }}
          justifyContent="space-between"
          gap={2}
        >
          <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 2.5,
                flexShrink: 0,
                color: "primary.main",
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                border: "1px solid",
                borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                boxShadow: (t) =>
                  `inset 0 1px 0 ${alpha(t.palette.common.white, 0.45)}`,
              }}
            >
              <CalendarMonth aria-hidden sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0, pt: 0.25 }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  color: "text.primary",
                }}
              >
                Eventos de la semana
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 0.75,
                  lineHeight: 1.5,
                  maxWidth: { sm: "42ch" },
                }}
              >
                Elige día y horario; aquí ves el cartel, cupos y tu inscripción.
              </Typography>
            </Box>
          </Stack>
          {showSeeAllLink ? (
            <Button
              component={Link}
              href="/dashboard/eventos"
              size="medium"
              color="primary"
              variant="outlined"
              endIcon={<OpenInNew sx={{ fontSize: 18 }} />}
              sx={{
                flexShrink: 0,
                fontWeight: 600,
                borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                alignSelf: { xs: "stretch", sm: "flex-start" },
              }}
            >
              Vista completa
            </Button>
          ) : null}
        </Stack>
      </Box>

      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.5 },
          "&:last-child": { pb: { xs: 2.5, sm: 3 } },
        }}
      >
        <Box sx={{ mb: 2 }}>
          <WeekRangeNavigator
            weekAnchor={weekAnchor}
            onWeekAnchorChange={(d) => setWeekAnchor(d)}
          />
        </Box>

        <Box
          ref={dayPickerStripRef}
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
              bgcolor: (t) => alpha(t.palette.text.primary, 0.15),
            },
          }}
        >
          {dayKeys.map((key, idx) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + idx);
            const count = countsByDay.get(key) ?? 0;
            const selected = idx === selectedOffset;
            const isToday = key === localDayKey(new Date());
            return (
              <Button
                key={key}
                ref={(el) => {
                  dayPickerButtonRefs.current[idx] = el;
                }}
                onClick={() => setSelectedOffset(idx)}
                variant={selected ? "contained" : "outlined"}
                color={selected ? "primary" : "inherit"}
                size="small"
                aria-pressed={selected}
                aria-current={selected ? "date" : undefined}
                sx={{
                  minWidth: 58,
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  py: 1.35,
                  flexDirection: "column",
                  lineHeight: 1.2,
                  borderRadius: 2.5,
                  borderWidth: isToday && !selected ? 2 : 1,
                  borderColor:
                    isToday && !selected
                      ? (t) => alpha(t.palette.primary.main, 0.45)
                      : undefined,
                  bgcolor: selected ? undefined : (t) => alpha(t.palette.background.paper, 0.8),
                  transition:
                    "background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: selected
                    ? (t) => `0 8px 20px -8px ${alpha(t.palette.primary.main, 0.45)}`
                    : "none",
                  "&:active": { transform: "scale(0.98)" },
                }}
              >
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ opacity: selected ? 0.95 : 0.75, fontWeight: 600 }}
                >
                  {WEEKDAY_SHORT[idx]}
                </Typography>
                <Typography variant="body2" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>
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
                      "& .MuiChip-label": {
                        px: 0.75,
                        fontSize: 10,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      },
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
        ) : !eventsForDay.length && events.length > 0 ? (
          <Stack
            alignItems="stretch"
            spacing={1.5}
            sx={{
              py: 3,
              px: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: "1px dashed",
              borderColor: (t) => alpha(t.palette.text.primary, 0.12),
              bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
            }}
          >
            <Stack direction="row" alignItems="flex-start" gap={1.5}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  flexShrink: 0,
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
                  color: "text.secondary",
                }}
              >
                <EventAvailable sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography color="text.primary" fontWeight={700} sx={{ letterSpacing: "-0.02em" }}>
                  No hay eventos este día
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, maxWidth: 480 }}>
                  Esta semana hay otros eventos (incluidos los que ya pasaron). Toca uno para ver el
                  detalle o elige ese día en la fila superior.
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={1} sx={{ pl: { xs: 0, sm: 0 }, pt: 0.5 }}>
              {eventsWeekSorted.map((ev) => {
                const k = localDayKey(new Date(ev.startsAt));
                let dayOffset = 0;
                for (let i = 0; i < 7; i++) {
                  const d = new Date(weekStart);
                  d.setDate(weekStart.getDate() + i);
                  if (localDayKey(d) === k) {
                    dayOffset = i;
                    break;
                  }
                }
                return (
                  <Button
                    key={ev._id}
                    type="button"
                    variant="outlined"
                    color="primary"
                    fullWidth
                    sx={{ justifyContent: "flex-start", textAlign: "left", py: 1.25 }}
                    onClick={() => {
                      setSelectedOffset(dayOffset);
                      setSelectedEventId(ev._id);
                    }}
                  >
                    <Box component="span" sx={{ width: "100%" }}>
                      <Typography component="span" variant="body2" fontWeight={700} display="block">
                        {formatWhen(ev.startsAt)}
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.25 }}
                      >
                        {ev.title}
                      </Typography>
                    </Box>
                  </Button>
                );
              })}
            </Stack>
          </Stack>
        ) : !eventsForDay.length ? (
          <Stack
            alignItems="flex-start"
            spacing={1.25}
            sx={{
              py: 4,
              px: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: "1px dashed",
              borderColor: (t) => alpha(t.palette.text.primary, 0.12),
              bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
            }}
          >
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
                  color: "text.secondary",
                }}
              >
                <EventAvailable sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography color="text.primary" fontWeight={700} sx={{ letterSpacing: "-0.02em" }}>
                  No hay eventos esta semana
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, maxWidth: 360 }}>
                  Cambia de día en la fila superior o navega a otra semana.
                </Typography>
              </Box>
            </Stack>
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
                sx={{ mb: 2.5 }}
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
                      sx={{
                        fontWeight: active ? 700 : 600,
                        borderRadius: 2,
                        borderColor: active ? undefined : (t) => alpha(t.palette.text.primary, 0.14),
                        transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                        "&:active": { transform: "scale(0.98)" },
                      }}
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
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ letterSpacing: "0.12em", fontWeight: 700 }}
                    >
                      Horario
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{ lineHeight: 1.35, letterSpacing: "-0.02em", mt: 0.25 }}
                    >
                      {formatWhen(selectedEvent.startsAt)}
                    </Typography>
                  </Box>
                  {!selectedUnlimitedCapacity ? (
                    <Chip
                      icon={<Groups sx={{ fontSize: "18px !important" }} />}
                      label={`${selectedEvent.participantCount}/${selectedEvent.maxParticipants}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        flexShrink: 0,
                        fontVariantNumeric: "tabular-nums",
                        borderRadius: 2,
                        borderColor: (t) => alpha(t.palette.text.primary, 0.16),
                      }}
                    />
                  ) : null}
                </Stack>

                {!selectedUnlimitedCapacity ? <LinearCapacity value={fillPct} /> : null}

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems="stretch"
                  sx={{ mt: 2.5 }}
                >
                  <Box sx={{ flex: isMdUp ? 7 : undefined, minWidth: 0 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        borderRadius: 3,
                        borderColor: (t) => alpha(t.palette.text.primary, 0.1),
                        bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
                        boxShadow: "none",
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        <Typography
                          variant="overline"
                          color="primary"
                          sx={{ fontWeight: 800, letterSpacing: "0.1em" }}
                        >
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
                                      fontSize: "16px !important",
                                      color: "secondary.main",
                                    }}
                                  />
                                }
                                label={selectedEvent.league.name}
                                title={`Ver clasificación de la liga: ${selectedEvent.league.name}`}
                                aria-label={`Abrir liga ${selectedEvent.league.name}`}
                                variant="outlined"
                                sx={{
                                  maxWidth: { xs: "100%", sm: 240 },
                                  fontWeight: 700,
                                  borderColor: (t) => alpha(t.palette.secondary.main, 0.45),
                                  color: "secondary.main",
                                  bgcolor: (t) => alpha(t.palette.secondary.main, 0.06),
                                  transition: (t) =>
                                    t.transitions.create(["background-color", "border-color", "box-shadow"], {
                                      duration: t.transitions.duration.shortest,
                                    }),
                                  "&:hover": {
                                    bgcolor: (t) => alpha(t.palette.secondary.main, 0.12),
                                    borderColor: "secondary.main",
                                    boxShadow: (t) => `0 1px 4px ${alpha(t.palette.secondary.main, 0.25)}`,
                                  },
                                  "&:focus-visible": {
                                    outline: "2px solid",
                                    outlineColor: "secondary.main",
                                    outlineOffset: 2,
                                  },
                                  "& .MuiChip-label": {
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    px: 0.5,
                                  },
                                }}
                              />
                            ) : null}
                            {selectedEvent.kind === "tournament" &&
                            selectedEvent.roundNum > 0 ? (
                              <Chip
                                size="small"
                                label={`Ronda ${selectedEvent.roundNum}`}
                                variant="outlined"
                                sx={{
                                  borderColor: (t) => alpha(t.palette.text.primary, 0.2),
                                  color: "text.secondary",
                                  fontVariantNumeric: "tabular-nums",
                                }}
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
                          {selectedEvent.state !== "close" ? (
                            <Box
                              sx={{
                                mt: 0.5,
                                p: 1.5,
                                borderRadius: 2.5,
                                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                                border: "1px solid",
                                borderColor: (t) => alpha(t.palette.primary.main, 0.18),
                                boxShadow: (t) =>
                                  `inset 0 1px 0 ${alpha(t.palette.common.white, 0.5)}`,
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                                Preinscripción hasta las{" "}
                                <strong>{formatCloseNote(selectedEvent.startsAt)}</strong>{" "}
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
                        height: "100%",
                        borderRadius: 3,
                        borderColor: (t) => alpha(t.palette.primary.main, 0.22),
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                        boxShadow: (t) =>
                          `inset 0 1px 0 ${alpha(t.palette.common.white, 0.55)}`,
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        {selectedEvent.kind === "tournament" && selectedEvent.state === "close" ? (
                          <Stack spacing={2.5}>
                            <Box>
                              <Typography
                                variant="overline"
                                color="primary"
                                sx={{ fontWeight: 800, letterSpacing: "0.08em" }}
                              >
                                Clasificación final
                              </Typography>
                            </Box>
                            {selectedEvent.myRegistration ? (
                              <Typography variant="body2">
                                Lista como{" "}
                                <Box component="strong" sx={{ color: "text.primary" }}>
                                  {selectedEvent.myRegistration}
                                </Box>
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
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
                                  bgcolor: (t) => alpha(t.palette.success.main, 0.06),
                                  border: 1,
                                  borderColor: (t) => alpha(t.palette.success.main, 0.28),
                                }}
                              >
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <EmojiEvents fontSize="small" color="success" />
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    Tu resultado
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
                                        <strong>{selectedEvent.myTournamentPlacement.place}º</strong> en
                                        categoría{" "}
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
                                    <Box component="span" fontWeight={700} color="text.primary">
                                      {selectedEvent.myMatchRecord.wins} /{" "}
                                      {selectedEvent.myMatchRecord.losses} /{" "}
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
                                categories={selectedEvent.standingsTopByCategory}
                              />
                            ) : (
                              <Alert severity="info" variant="outlined">
                                La clasificación detallada aún no está publicada para este evento.
                              </Alert>
                            )}
                            <Button
                              type="button"
                              variant="outlined"
                              color="inherit"
                              fullWidth
                              size="medium"
                              startIcon={<EmojiEvents />}
                              onClick={() => setFullStandingsOpenForEventId(selectedEvent._id)}
                            >
                              Ver standing completo
                            </Button>
                          </Stack>
                        ) : (
                          <>
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
                            {selectedEvent.kind === "tournament" && selectedEvent.state === "running" ? (
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
                        </>
                        )}

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
                          open={fullStandingsModalOpen}
                          onClose={() => setFullStandingsOpenForEventId(null)}
                          fullWidth
                          maxWidth="md"
                          aria-labelledby="full-standings-dialog-title"
                          PaperProps={{
                            sx: {
                              maxHeight: "min(92vh, 880px)",
                              display: "flex",
                              flexDirection: "column",
                              overflow: "hidden",
                            },
                          }}
                        >
                          <DialogTitle
                            id="full-standings-dialog-title"
                            sx={{ flexShrink: 0 }}
                          >
                            Clasificación completa
                          </DialogTitle>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ px: 3, pb: 0, mt: -1, flexShrink: 0 }}
                          >
                            {selectedEvent.title}
                          </Typography>
                          <DialogContent
                            dividers
                            sx={{
                              pt: 2,
                              overflow: "hidden",
                              display: "flex",
                              flexDirection: "column",
                              flex: "1 1 auto",
                              minHeight: 0,
                            }}
                          >
                            {fullStandingsQuery.isPending ? (
                              <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
                                <CircularProgress size={36} aria-label="Cargando clasificación" />
                              </Stack>
                            ) : fullStandingsQuery.isError ? (
                              <Alert severity="error" variant="outlined">
                                {fullStandingsQuery.error instanceof Error
                                  ? fullStandingsQuery.error.message
                                  : "No se pudo cargar la clasificación"}
                              </Alert>
                            ) : fullStandingsQuery.data?.standingsFullByCategory &&
                              fullStandingsQuery.data.standingsFullByCategory.length > 0 ? (
                              <TournamentFinishedStandingsTabs
                                key={`${selectedEvent._id}-full`}
                                variant="dialog"
                                categories={fullStandingsQuery.data.standingsFullByCategory}
                              />
                            ) : (
                              <Alert severity="info" variant="outlined">
                                La clasificación detallada aún no está publicada para este evento.
                              </Alert>
                            )}
                          </DialogContent>
                          <DialogActions sx={{ px: 3, pb: 2, pt: 1, flexShrink: 0 }}>
                            <Button
                              variant="contained"
                              onClick={() => setFullStandingsOpenForEventId(null)}
                            >
                              Cerrar
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
        <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing="0.04em">
          Cupo
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
        >
          {value}%
        </Typography>
      </Stack>
      <Box
        sx={{
          height: 7,
          borderRadius: 99,
          bgcolor: (t) => alpha(t.palette.text.primary, 0.07),
          overflow: "hidden",
          border: "1px solid",
          borderColor: (t) => alpha(t.palette.text.primary, 0.06),
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${value}%`,
            borderRadius: 99,
            bgcolor: (t) =>
              value >= 90 ? t.palette.warning.main : t.palette.primary.main,
            transition: "width 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: (t) => `inset 0 -1px 0 ${alpha(t.palette.common.black, 0.08)}`,
          }}
        />
      </Box>
    </Box>
  );
}
