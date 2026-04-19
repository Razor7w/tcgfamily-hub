"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import {
  ArrowBack,
  CheckCircle,
  Groups,
  InfoOutlined,
  Settings,
  UploadFile,
} from "@mui/icons-material";
import TournamentTdfLoader from "@/components/admin/TournamentTdfLoader";
import { WEEKLY_EVENT_PARTICIPANTS_MAX } from "@/lib/parse-pasted-event-flyer";
import { popidForStorage } from "@/lib/rut-chile";
import {
  AdminWeeklyEvent,
  type WeeklyEventState,
  useAdminEvents,
  useAdminLeagues,
  useConfirmParticipantParticipation,
  useUpdateAdminEvent,
} from "@/hooks/useWeeklyEvents";

function kindLabelAdmin(k: AdminWeeklyEvent["kind"]) {
  if (k === "tournament") return "Torneo";
  if (k === "trade_day") return "Intercambio";
  return "Otro";
}

function gameLabelAdmin(g: AdminWeeklyEvent["game"]) {
  if (g === "pokemon") return "Pokémon";
  if (g === "magic") return "Magic";
  return "Otro TCG";
}

function eventStateLabel(s: WeeklyEventState) {
  if (s === "running") return "En curso";
  if (s === "close") return "Cerrado";
  return "Programado";
}

export default function AdminEventoDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data, isPending, isError, error, refetch } = useAdminEvents();
  const { data: leaguesData } = useAdminLeagues();
  const confirmParticipation = useConfirmParticipantParticipation();
  const updateEv = useUpdateAdminEvent();

  const ev = useMemo(
    () => (id ? (data?.events.find((e) => e._id === id) ?? null) : null),
    [data?.events, id],
  );

  const registeredPopIdsForTdf = useMemo(
    () =>
      ev
        ? ev.participants
            .map((p) => popidForStorage(p.popId ?? ""))
            .filter((pid) => pid.length > 0)
        : [],
    [ev],
  );

  const syncedRoundNumsForTdf = useMemo(
    () => ev?.roundSnapshots?.map((s) => s.roundNum) ?? [],
    [ev?.roundSnapshots],
  );

  const [tab, setTab] = useState(0);
  const [dashboardCapInput, setDashboardCapInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leagueIdInput, setLeagueIdInput] = useState("");

  useEffect(() => {
    if (!ev) {
      setDashboardCapInput("");
      setLeagueIdInput("");
      return;
    }
    const c = ev.dashboardRoundCap ?? 0;
    setDashboardCapInput(c > 0 ? String(c) : "");
    setLeagueIdInput(ev.leagueId ?? "");
  }, [ev?._id, ev?.dashboardRoundCap, ev?.leagueId]);

  const saveDashboardRoundCap = async () => {
    if (!ev || ev.kind !== "tournament") return;
    const trimmed = dashboardCapInput.trim();
    const n = trimmed === "" ? 0 : Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 99) return;
    try {
      await updateEv.mutateAsync({
        id: ev._id,
        body: { dashboardRoundCap: Math.round(n) },
      });
    } catch {
      /* error en estado */
    }
  };

  const saveLeagueAssignment = async () => {
    if (!ev || ev.kind !== "tournament") return;
    try {
      await updateEv.mutateAsync({
        id: ev._id,
        body: { leagueId: leagueIdInput.trim() || null },
      });
      setSettingsOpen(false);
    } catch {
      /* error en estado */
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2.5}>
          <Button
            component={Link}
            href="/admin/eventos"
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            sx={{
              alignSelf: "flex-start",
              borderColor: (theme) => theme.palette.divider,
            }}
          >
            Volver a eventos
          </Button>

          {isPending ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                p: 3,
              }}
            >
              <Stack spacing={1.5}>
                <Box sx={{ height: 28, width: "55%", borderRadius: 1, bgcolor: "action.hover" }} />
                <Box sx={{ height: 18, width: "35%", borderRadius: 1, bgcolor: "action.hover" }} />
                <Box sx={{ height: 120, borderRadius: 2, bgcolor: "action.hover", mt: 1 }} />
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
              {error instanceof Error ? error.message : "Error al cargar"}
            </Alert>
          ) : !ev ? (
            <Alert severity="warning">
              No se encontró el evento.{" "}
              <Link href="/admin/eventos" style={{ fontWeight: 600 }}>
                Volver al listado
              </Link>
            </Alert>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  boxShadow: "0 20px 40px -24px rgba(24, 24, 27, 0.1)",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "flex-start" }}
                  justifyContent="space-between"
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                      {ev.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, fontVariantNumeric: "tabular-nums" }}>
                      {new Date(ev.startsAt).toLocaleString("es-CL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Box>
                  {ev.kind === "tournament" ? (
                    <Button
                      variant="outlined"
                      startIcon={<Settings />}
                      onClick={() => setSettingsOpen(true)}
                      sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, fontWeight: 700 }}
                    >
                      Ajustes
                    </Button>
                  ) : null}
                </Stack>
              </Paper>

              <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
                <Chip
                  size="small"
                  label={eventStateLabel(
                    ev.state === "running" || ev.state === "close" ? ev.state : "schedule",
                  )}
                  color={
                    ev.state === "running"
                      ? "success"
                      : ev.state === "close"
                        ? "default"
                        : "info"
                  }
                  variant={ev.state === "schedule" ? "outlined" : "filled"}
                />
                <Chip size="small" label={kindLabelAdmin(ev.kind)} variant="outlined" />
                <Chip size="small" label={gameLabelAdmin(ev.game)} variant="outlined" />
                {ev.kind === "tournament" && ev.game === "pokemon" && ev.pokemonSubtype ? (
                  <Chip size="small" label={ev.pokemonSubtype} color="primary" variant="outlined" />
                ) : null}
                {ev.kind === "tournament" ? (
                  <Chip
                    size="small"
                    label={ev.league?.name ?? "Sin liga"}
                    color={ev.league ? "secondary" : "default"}
                    variant="outlined"
                  />
                ) : null}
              </Stack>

              <Stack spacing={0.75} sx={{ typography: "body2", color: "text.secondary" }}>
                <span>
                  <strong style={{ color: "inherit" }}>Precio:</strong>{" "}
                  {ev.kind === "tournament"
                    ? ev.priceClp > 0
                      ? `${ev.priceClp.toLocaleString("es-CL")} CLP`
                      : "Gratis"
                    : "—"}
                </span>
                <span>
                  <strong>Cupo:</strong>{" "}
                  {ev.maxParticipants >= WEEKLY_EVENT_PARTICIPANTS_MAX
                    ? "Ilimitado"
                    : ev.maxParticipants}
                </span>
                <span>
                  <strong>Inscritos:</strong> {ev.participants?.length ?? 0}
                </span>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  Ubicación
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {ev.location?.trim() || "—"}
                </Typography>
              </Box>

              {ev.formatNotes?.trim() ? (
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Formato / rondas
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                    {ev.formatNotes}
                  </Typography>
                </Box>
              ) : null}

              {ev.prizesNotes?.trim() ? (
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Premios
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                    {ev.prizesNotes}
                  </Typography>
                </Box>
              ) : null}

              {ev.kind === "tournament" ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 2.25 },
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (theme) => theme.palette.action.hover,
                  }}
                >
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Dashboard de jugadores
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2, lineHeight: 1.55 }}>
                    Limita hasta qué ronda se muestra en el panel y en los emparejamientos públicos. Útil si
                    sincronizaste una ronda de más pero el torneo oficial terminó antes. En admin sigues viendo
                    la ronda real ({ev.roundNum ?? 0}).
                  </Typography>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "stretch", sm: "flex-start" }}
                  >
                    <TextField
                      label="Mostrar hasta la ronda"
                      type="number"
                      value={dashboardCapInput}
                      onChange={(e) => setDashboardCapInput(e.target.value)}
                      inputProps={{ min: 0, max: 99 }}
                      helperText="0 o vacío = sin tope (se muestra la ronda sincronizada)."
                      fullWidth
                      sx={{ maxWidth: { sm: 280 } }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => void saveDashboardRoundCap()}
                      disabled={updateEv.isPending}
                      sx={{ fontWeight: 700, flexShrink: 0 }}
                    >
                      Guardar tope
                    </Button>
                  </Stack>
                  {updateEv.isError && updateEv.error instanceof Error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {updateEv.error.message}
                    </Alert>
                  ) : null}
                </Paper>
              ) : null}

              <Divider sx={{ my: 0.5 }} />

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: (theme) => theme.palette.action.hover }}>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  aria-label="Secciones del evento"
                  variant="fullWidth"
                  sx={{
                    "& .MuiTab-root": {
                      fontWeight: 700,
                      textTransform: "none",
                      minHeight: 52,
                    },
                  }}
                >
                  <Tab
                    icon={<Groups sx={{ fontSize: 22 }} />}
                    iconPosition="start"
                    label={`Preinscritos${
                      (ev.participants?.length ?? 0) > 0 ? ` (${ev.participants.length})` : ""
                    }`}
                    id="event-tab-preinscritos"
                    aria-controls="event-tabpanel-preinscritos"
                  />
                  <Tab
                    icon={<UploadFile sx={{ fontSize: 22 }} />}
                    iconPosition="start"
                    label="Cargar TDF"
                    id="event-tab-tdf"
                    aria-controls="event-tabpanel-tdf"
                  />
                </Tabs>
                </Box>

              <Box
                role="tabpanel"
                hidden={tab !== 0}
                id="event-tabpanel-preinscritos"
                aria-labelledby="event-tab-preinscritos"
                sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0 }}
              >
                {tab === 0 ? (
                  <Stack spacing={2} sx={{ pt: 2 }}>
                    <Alert severity="info" icon={<InfoOutlined />} variant="outlined">
                      Toca el ícono de check para confirmar o cancelar la asistencia en tienda. POP ID
                      viene del perfil del usuario.
                    </Alert>
                    {confirmParticipation.isError ? (
                      <Alert severity="error">
                        {confirmParticipation.error instanceof Error
                          ? confirmParticipation.error.message
                          : "Error"}
                      </Alert>
                    ) : null}
                    {ev.participants.length === 0 ? (
                      <Typography color="text.secondary" sx={{ py: 1 }}>
                        No hay preinscritos.
                      </Typography>
                    ) : (
                      <Stack
                        divider={<Divider flexItem />}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        {ev.participants.map((p, idx) => (
                          <Stack
                            key={`${p.userId ?? "sin-usuario"}-${idx}`}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1.5}
                            sx={{
                              px: 2,
                              py: 1.75,
                              bgcolor: idx % 2 === 0 ? "action.hover" : "background.paper",
                              transition: "background-color 0.2s ease",
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                title={p.displayName}
                                sx={{
                                  letterSpacing: "-0.01em",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {p.displayName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="p"
                                sx={{ mt: 0.35, fontVariantNumeric: "tabular-nums" }}
                              >
                                POP: {p.popId}
                              </Typography>
                              {!p.userId ? (
                                <Typography
                                  variant="caption"
                                  color="warning.main"
                                  component="p"
                                  sx={{ mt: 0.35, lineHeight: 1.3 }}
                                >
                                  Sin cuenta vinculada
                                </Typography>
                              ) : null}
                            </Box>
                            <IconButton
                              size="small"
                              disabled={!p.userId || confirmParticipation.isPending}
                              onClick={async () => {
                                if (!p.userId) return;
                                try {
                                  await confirmParticipation.mutateAsync({
                                    eventId: ev._id,
                                    userId: p.userId,
                                    confirmed: !p.confirmed,
                                  });
                                } catch {
                                  /* error en estado */
                                }
                              }}
                              aria-label={
                                p.confirmed ? "Quitar confirmación" : "Confirmar participación"
                              }
                              sx={(theme) => ({
                                flexShrink: 0,
                                border: "1px solid",
                                borderColor: p.confirmed
                                  ? theme.palette.success.main
                                  : theme.palette.divider,
                                color: p.confirmed
                                  ? theme.palette.success.main
                                  : theme.palette.grey[500],
                                "&.Mui-disabled": {
                                  color: theme.palette.action.disabled,
                                },
                              })}
                            >
                              <CheckCircle sx={{ fontSize: 26 }} />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                ) : null}
              </Box>

              <Box
                role="tabpanel"
                hidden={tab !== 1}
                id="event-tabpanel-tdf"
                aria-labelledby="event-tab-tdf"
                sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0 }}
              >
                {tab === 1 ? (
                  <Box sx={{ pt: 2 }}>
                    <TournamentTdfLoader
                      eventId={ev._id}
                      registeredPopIds={registeredPopIdsForTdf}
                      syncedRoundNums={syncedRoundNumsForTdf}
                    />
                  </Box>
                ) : null}
              </Box>
              </Paper>

              <Dialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                fullWidth
                maxWidth="sm"
                aria-labelledby="event-settings-title"
              >
                <DialogTitle id="event-settings-title">Ajustes del torneo</DialogTitle>
                <DialogContent dividers>
                  <Stack spacing={2} sx={{ pt: 0.5 }}>
                    <Alert severity="info" variant="outlined">
                      Asigna una liga para que este torneo sume puntos en la tabla pública por división de edad cuando quede
                      cerrado y tenga standings importados.
                    </Alert>
                    <FormControl fullWidth>
                      <InputLabel id="event-league-select-label">Liga</InputLabel>
                      <Select
                        labelId="event-league-select-label"
                        label="Liga"
                        value={leagueIdInput}
                        onChange={(e) => setLeagueIdInput(String(e.target.value))}
                      >
                        <MenuItem value="">Sin liga</MenuItem>
                        {(leaguesData?.leagues ?? [])
                          .filter((l) => l.isActive)
                          .map((l) => (
                            <MenuItem key={l._id} value={l._id}>
                              {l.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    {ev.league ? (
                      <Typography variant="body2" color="text.secondary">
                        Liga actual: <strong>{ev.league.name}</strong>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Este torneo no tiene una liga asignada.
                      </Typography>
                    )}
                    {updateEv.isError && updateEv.error instanceof Error ? (
                      <Alert severity="error">{updateEv.error.message}</Alert>
                    ) : null}
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setSettingsOpen(false)}>Cancelar</Button>
                  <Button
                    variant="contained"
                    onClick={() => void saveLeagueAssignment()}
                    disabled={updateEv.isPending}
                  >
                    Guardar liga
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
