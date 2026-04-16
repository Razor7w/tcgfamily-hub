"use client";

import { useEffect, useMemo, useState } from "react";
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
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ChevronLeft,
  ChevronRight,
  EmojiEvents,
  Groups,
  LocalActivity,
  Place,
  SportsMartialArts,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  PublicWeeklyEvent,
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
  if (ev.priceClp <= 0) return "GRATUITO";
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
  return `${dayCap} ${datePart} · ${timePart} hrs.`;
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

type WeeklyEventsSectionProps = {
  /** En el dashboard se muestra un enlace a la vista completa. */
  showSeeAllLink?: boolean;
};

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

  const events = data?.events ?? [];

  const selectedDate = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + selectedOffset);
    return d;
  }, [weekStart, selectedOffset]);

  const eventsForDay = useMemo(() => {
    return events.filter((e) => sameLocalDay(new Date(e.startsAt), selectedDate));
  }, [events, selectedDate]);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventsForDay.length) {
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId((prev) => {
      if (prev && eventsForDay.some((e) => e._id === prev)) return prev;
      return eventsForDay[0]?._id ?? null;
    });
  }, [eventsForDay]);

  const selectedEvent =
    eventsForDay.find((e) => e._id === selectedEventId) ?? eventsForDay[0] ?? null;

  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);

  const [nameInput, setNameInput] = useState("");
  useEffect(() => {
    const n = session?.user?.name?.trim();
    setNameInput(n ?? "");
  }, [session?.user?.name, selectedEvent?._id]);

  useEffect(() => {
    setParticipantsModalOpen(false);
  }, [selectedEvent?._id]);

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
  const canSubmit =
    !regReason &&
    nameInput.trim().length > 0 &&
    !register.isPending &&
    !!selectedEvent;

  return (
    <Card elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          "&:last-child": { pb: { xs: 2, sm: 3 } },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            Eventos de la semana
          </Typography>
          {showSeeAllLink ? (
            <Button component={Link} href="/dashboard/eventos" size="small">
              Ver semana completa
            </Button>
          ) : null}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton
            size="small"
            aria-label="Semana anterior"
            onClick={handlePrevWeek}
          >
            <ChevronLeft />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {weekStart.toLocaleDateString("es-CL", {
              day: "numeric",
              month: "long",
            })}{" "}
            –{" "}
            {(() => {
              const end = new Date(weekStart);
              end.setDate(weekStart.getDate() + 6);
              return end.toLocaleDateString("es-CL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
            })()}
          </Typography>
          <IconButton
            size="small"
            aria-label="Semana siguiente"
            onClick={handleNextWeek}
          >
            <ChevronRight />
          </IconButton>
        </Stack>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 1,
            mx: { xs: -0.5, sm: 0 },
            px: 0.5,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {dayKeys.map((key, idx) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + idx);
            const count = countsByDay.get(key) ?? 0;
            const selected = idx === selectedOffset;
            return (
              <Button
                key={key}
                onClick={() => setSelectedOffset(idx)}
                variant={selected ? "contained" : "outlined"}
                size="small"
                sx={{
                  minWidth: 56,
                  flexShrink: 0,
                  py: 1,
                  flexDirection: "column",
                  lineHeight: 1.2,
                }}
              >
                <Typography variant="caption" display="block">
                  {WEEKDAY_SHORT[idx]}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {d.getDate()}
                </Typography>
                {count > 0 ? (
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      mt: 0.5,
                      height: 18,
                      "& .MuiChip-label": { px: 0.75, fontSize: 10 },
                    }}
                  />
                ) : null}
              </Button>
            );
          })}
        </Box>

        {isPending ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          >
            {error instanceof Error ? error.message : "No se pudieron cargar los eventos"}
          </Alert>
        ) : !eventsForDay.length ? (
          <Typography color="text.secondary" sx={{ py: 3 }}>
            No hay eventos programados para este día.
          </Typography>
        ) : (
          <>
            {eventsForDay.length > 1 ? (
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                {eventsForDay.map((ev) => (
                  <Chip
                    key={ev._id}
                    label={ev.title}
                    onClick={() => setSelectedEventId(ev._id)}
                    color={ev._id === selectedEvent?._id ? "primary" : "default"}
                    variant={ev._id === selectedEvent?._id ? "filled" : "outlined"}
                  />
                ))}
              </Stack>
            ) : null}

            {selectedEvent ? (
              <>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {formatWhen(selectedEvent.startsAt)}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Groups fontSize="small" color="action" />
                    <Typography variant="body2">
                      {selectedEvent.participantCount}/{selectedEvent.maxParticipants}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems="stretch"
                >
                  <Box sx={{ flex: isMdUp ? 7 : undefined, minWidth: 0 }}>
                    <Card variant="outlined" sx={{ height: "100%" }}>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <EmojiEvents sx={{ color: "warning.main" }} />
                            <Typography variant="h6" component="h3">
                              {selectedEvent.title}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {formatWhen(selectedEvent.startsAt)}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <SportsMartialArts fontSize="small" color="action" />
                            <Typography variant="body2">
                              {gameLabel(selectedEvent.game)} · {kindLabel(selectedEvent.kind)}
                              {selectedEvent.kind === "tournament" &&
                              selectedEvent.game === "pokemon" &&
                              selectedEvent.pokemonSubtype
                                ? ` · ${pokemonSubtypeLabel(selectedEvent.pokemonSubtype)}`
                                : ""}
                            </Typography>
                          </Stack>
                          {selectedEvent.formatNotes ? (
                            <Typography variant="body2">
                              {selectedEvent.formatNotes}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocalActivity fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight={600}>
                              {formatPrice(selectedEvent)}
                            </Typography>
                          </Stack>
                          {selectedEvent.prizesNotes ? (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <EmojiEvents fontSize="small" color="action" sx={{ mt: 0.25 }} />
                              <Typography variant="body2">
                                {selectedEvent.prizesNotes}
                              </Typography>
                            </Stack>
                          ) : null}
                          {selectedEvent.location ? (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <Place fontSize="small" color="action" sx={{ mt: 0.25 }} />
                              <Typography variant="body2">
                                {selectedEvent.location}
                              </Typography>
                            </Stack>
                          ) : null}
                          <Box
                            sx={{
                              mt: 1,
                              p: 1.5,
                              borderRadius: 1,
                              bgcolor: "action.hover",
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Preinscripción válida hasta las{" "}
                              {formatCloseNote(selectedEvent.startsAt)} del mismo día (un
                              segundo antes de iniciar el evento).
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box sx={{ flex: isMdUp ? 5 : undefined, minWidth: 0 }}>
                    <Card variant="outlined" sx={{ height: "100%" }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                          Preinscríbete
                        </Typography>
                        {regReason ? (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            {regReason}
                          </Alert>
                        ) : null}
                        {selectedEvent.myRegistration ? (
                          <Stack spacing={2} sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              Te preinscribiste como:{" "}
                              <strong>{selectedEvent.myRegistration}</strong>
                            </Typography>
                            {selectedEvent.myAttendanceConfirmed ? (
                              <Alert severity="success">
                                Asistencia confirmada
                              </Alert>
                            ) : selectedEvent.canUnregister ? (
                              <Button
                                type="button"
                                variant="outlined"
                                color="error"
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
                                {unregister.isPending
                                  ? "Quitando…"
                                  : "Desinscribirse"}
                              </Button>
                            ) : (
                              <Alert severity="info">
                                No puedes desinscribirte: el evento ya comenzó.
                              </Alert>
                            )}
                            {unregister.isError ? (
                              <Alert severity="error">
                                {unregister.error instanceof Error
                                  ? unregister.error.message
                                  : "Error"}
                              </Alert>
                            ) : null}
                          </Stack>
                        ) : (
                          <Stack spacing={2} component="form" noValidate>
                            <TextField
                              label="Nombre para la lista"
                              placeholder="Ingresa tu nombre"
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              fullWidth
                              size="small"
                              disabled={!selectedEvent.canPreRegister}
                            />
                            <Button
                              type="button"
                              variant="contained"
                              disabled={!canSubmit}
                              onClick={async () => {
                                if (!selectedEvent) return;
                                try {
                                  await register.mutateAsync({
                                    eventId: selectedEvent._id,
                                    displayName: nameInput.trim(),
                                  });
                                } catch {
                                  /* error en estado */
                                }
                              }}
                            >
                              {register.isPending ? "Enviando…" : "Preinscribirse"}
                            </Button>
                            {register.isError ? (
                              <Alert severity="error">
                                {register.error instanceof Error
                                  ? register.error.message
                                  : "Error"}
                              </Alert>
                            ) : null}
                          </Stack>
                        )}

                        <Button
                          type="button"
                          variant="outlined"
                          fullWidth
                          sx={{ mt: 2 }}
                          startIcon={<Groups />}
                          onClick={() => setParticipantsModalOpen(true)}
                        >
                          Ver participantes
                          {selectedEvent.participantCount > 0
                            ? ` (${selectedEvent.participantCount})`
                            : ""}
                        </Button>

                        <Dialog
                          open={participantsModalOpen}
                          onClose={() => setParticipantsModalOpen(false)}
                          fullWidth
                          maxWidth="sm"
                          aria-labelledby="participants-dialog-title"
                        >
                          <DialogTitle id="participants-dialog-title">
                            Ver participantes
                          </DialogTitle>
                          <DialogContent dividers>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 2 }}
                            >
                              {selectedEvent.title}
                            </Typography>
                            <List dense disablePadding>
                              {selectedEvent.participantNames.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  Aún no hay preinscritos.
                                </Typography>
                              ) : (
                                selectedEvent.participantNames.map((n, i) => (
                                  <ListItem key={`${i}-${n}`} disableGutters>
                                    <ListItemText
                                      primary={`${i + 1}. ${n}`}
                                      primaryTypographyProps={{ variant: "body2" }}
                                    />
                                  </ListItem>
                                ))
                              )}
                            </List>
                            <Box
                              sx={{
                                mt: 2,
                                p: 1.5,
                                borderRadius: 1,
                                bgcolor: "action.hover",
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                Solo se muestra el nombre público. Cierre de
                                preinscripción: {formatCloseNote(selectedEvent.startsAt)}.
                              </Typography>
                            </Box>
                          </DialogContent>
                          <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button
                              variant="contained"
                              onClick={() => setParticipantsModalOpen(false)}
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
