"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import {
  ArrowBack,
  CheckCircle,
  Groups,
  InfoOutlined,
  UploadFile,
} from "@mui/icons-material";
import TournamentTdfLoader from "@/components/admin/TournamentTdfLoader";
import {
  AdminWeeklyEvent,
  type WeeklyEventState,
  useAdminEvents,
  useConfirmParticipantParticipation,
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
  const confirmParticipation = useConfirmParticipantParticipation();

  const ev = useMemo(
    () => (id ? (data?.events.find((e) => e._id === id) ?? null) : null),
    [data?.events, id],
  );

  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={2.5}>
          <Button
            component={Link}
            href="/admin/eventos"
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            sx={{ alignSelf: "flex-start" }}
          >
            Volver a eventos
          </Button>

          {isPending ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
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
              <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                  {ev.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
                  <strong>Cupo:</strong> {ev.maxParticipants}
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

              <Divider sx={{ my: 1 }} />

              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  aria-label="Secciones del evento"
                  variant="fullWidth"
                  sx={{
                    "& .MuiTab-root": { fontWeight: 700, textTransform: "none", minHeight: 48 },
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
              >
                {tab === 0 ? (
                  <Stack spacing={2} sx={{ pt: 1 }}>
                    <Alert severity="info" icon={<InfoOutlined />}>
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
                      <Typography color="text.secondary">No hay preinscritos.</Typography>
                    ) : (
                      <Grid container spacing={2}>
                        {ev.participants.map((p, idx) => (
                          <Grid key={`${p.userId ?? "sin-usuario"}-${idx}`} size={{ xs: 6, md: 4 }}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                borderRadius: 2,
                                transition: "box-shadow 0.2s, border-color 0.2s",
                                "&:hover": {
                                  borderColor: "primary.light",
                                  boxShadow: 1,
                                },
                              }}
                            >
                              <Stack
                                direction="row"
                                alignItems="flex-start"
                                justifyContent="space-between"
                                gap={0.5}
                                sx={{ minHeight: 72 }}
                              >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                    title={p.displayName}
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {p.displayName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    component="p"
                                    sx={{ mt: 0.5 }}
                                  >
                                    POP: {p.popId}
                                  </Typography>
                                  {!p.userId ? (
                                    <Typography
                                      variant="caption"
                                      color="warning.main"
                                      component="p"
                                      sx={{ mt: 0.5, lineHeight: 1.3 }}
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
                                    color: p.confirmed
                                      ? theme.palette.success.main
                                      : theme.palette.grey[500],
                                    "&.Mui-disabled": {
                                      color: theme.palette.action.disabled,
                                    },
                                  })}
                                >
                                  <CheckCircle sx={{ fontSize: 28 }} />
                                </IconButton>
                              </Stack>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Stack>
                ) : null}
              </Box>

              <Box
                role="tabpanel"
                hidden={tab !== 1}
                id="event-tabpanel-tdf"
                aria-labelledby="event-tab-tdf"
              >
                {tab === 1 ? (
                  <Box sx={{ pt: 1 }}>
                    <TournamentTdfLoader />
                  </Box>
                ) : null}
              </Box>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
