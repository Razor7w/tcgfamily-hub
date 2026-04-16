"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import {
  ArrowBack,
  CheckCircle,
  Delete,
  Edit,
  EventAvailable,
  Groups,
  InfoOutlined,
} from "@mui/icons-material";
import Link from "next/link";
import {
  AdminWeeklyEvent,
  useAdminEvents,
  useConfirmParticipantParticipation,
  useCreateAdminEvent,
  useDeleteAdminEvent,
  useUpdateAdminEvent,
} from "@/hooks/useWeeklyEvents";

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormState = {
  title: string;
  startsAtLocal: string;
  kind: "tournament" | "trade_day" | "other";
  game: "pokemon" | "magic" | "other_tcg";
  pokemonSubtype: "casual" | "cup" | "challenge" | "";
  priceClp: string;
  gratis: boolean;
  maxParticipants: string;
  formatNotes: string;
  prizesNotes: string;
  location: string;
};

const emptyForm = (): FormState => ({
  title: "",
  startsAtLocal: toDatetimeLocalValue(new Date().toISOString()),
  kind: "tournament",
  game: "pokemon",
  pokemonSubtype: "casual",
  priceClp: "0",
  gratis: true,
  maxParticipants: "8",
  formatNotes: "",
  prizesNotes: "",
  location: "Av. Valparaíso 1195, Local 3",
});

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

function formFromEvent(ev: AdminWeeklyEvent): FormState {
  return {
    title: ev.title,
    startsAtLocal: toDatetimeLocalValue(ev.startsAt),
    kind: ev.kind,
    game: ev.game,
    pokemonSubtype:
      ev.pokemonSubtype === "casual" ||
      ev.pokemonSubtype === "cup" ||
      ev.pokemonSubtype === "challenge"
        ? ev.pokemonSubtype
        : "",
    priceClp: String(ev.priceClp ?? 0),
    gratis: (ev.priceClp ?? 0) <= 0,
    maxParticipants: String(ev.maxParticipants ?? 8),
    formatNotes: ev.formatNotes ?? "",
    prizesNotes: ev.prizesNotes ?? "",
    location: ev.location ?? "",
  };
}

export default function AdminEventosPage() {
  const { data, isPending, isError, error, refetch } = useAdminEvents();
  const createEv = useCreateAdminEvent();
  const updateEv = useUpdateAdminEvent();
  const deleteEv = useDeleteAdminEvent();
  const confirmParticipation = useConfirmParticipantParticipation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [participantsModalEventId, setParticipantsModalEventId] = useState<
    string | null
  >(null);
  const [editing, setEditing] = useState<AdminWeeklyEvent | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminWeeklyEvent | null>(null);

  const eventsSorted = useMemo(() => {
    const list = data?.events ?? [];
    return [...list].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [data?.events]);

  /** Modal sincronizado con la lista: sin efectos que copien el evento al estado. */
  const participantsModalEvent = useMemo(
    () =>
      participantsModalEventId
        ? (eventsSorted.find((e) => e._id === participantsModalEventId) ?? null)
        : null,
    [eventsSorted, participantsModalEventId],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (ev: AdminWeeklyEvent) => {
    setEditing(ev);
    setForm(formFromEvent(ev));
    setFormError(null);
    setDialogOpen(true);
  };

  const buildPayload = (): Record<string, unknown> => {
    const startsAt = new Date(form.startsAtLocal);
    if (Number.isNaN(startsAt.getTime())) {
      throw new Error("Fecha u hora inválida");
    }
    const maxParticipants = Math.round(Number(form.maxParticipants));
    if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
      throw new Error("Cupo máximo inválido");
    }
    let priceClp = 0;
    if (form.kind === "tournament") {
      if (!form.gratis) {
        const p = Math.round(Number(form.priceClp));
        if (!Number.isFinite(p) || p < 0) {
          throw new Error("Precio inválido");
        }
        priceClp = p;
      }
    }
    const payload: Record<string, unknown> = {
      startsAt: startsAt.toISOString(),
      title: form.title.trim(),
      kind: form.kind,
      game: form.game,
      maxParticipants,
      formatNotes: form.formatNotes.trim(),
      prizesNotes: form.prizesNotes.trim(),
      location: form.location.trim(),
      priceClp,
    };
    if (form.kind === "tournament" && form.game === "pokemon") {
      if (!form.pokemonSubtype) {
        throw new Error("Selecciona el tipo de torneo Pokémon");
      }
      payload.pokemonSubtype = form.pokemonSubtype;
    } else {
      payload.pokemonSubtype = null;
    }
    return payload;
  };

  const handleSave = async () => {
    setFormError(null);
    let payload: Record<string, unknown>;
    try {
      payload = buildPayload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Datos inválidos");
      return;
    }
    try {
      if (editing) {
        await updateEv.mutateAsync({ id: editing._id, body: payload });
      } else {
        await createEv.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {
      /* error de red / API */
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEv.mutateAsync(deleteTarget._id);
      if (participantsModalEventId === deleteTarget._id) {
        setParticipantsModalEventId(null);
      }
      setDeleteTarget(null);
    } catch {
      /* alert */
    }
  };

  const dialogError =
    formError ??
    (createEv.error instanceof Error
      ? createEv.error.message
      : updateEv.error instanceof Error
        ? updateEv.error.message
        : null);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={2}
          >
            <Button
              component={Link}
              href="/admin/users"
              variant="outlined"
              size="small"
              startIcon={<ArrowBack />}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
            >
              Volver
            </Button>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                Eventos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
                Crea y edita la cartelera: torneos (precio o gratis), intercambios y otros. Los
                jugadores se preinscriben desde su panel.
              </Typography>
            </Box>
            <Button variant="contained" size="large" onClick={openCreate} sx={{ fontWeight: 700 }}>
              Nuevo evento
            </Button>
          </Stack>
        </Stack>

        {isPending ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
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
        ) : (
          <Stack spacing={2}>
            {eventsSorted.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  py: 6,
                  px: 3,
                  textAlign: "center",
                  borderRadius: 3,
                  borderStyle: "dashed",
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
                }}
              >
                <EventAvailable sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
                <Typography fontWeight={700} gutterBottom>
                  Aún no hay eventos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: "auto" }}>
                  Publica el primero para que aparezca en el dashboard de los usuarios.
                </Typography>
                <Button variant="contained" onClick={openCreate}>
                  Crear evento
                </Button>
              </Paper>
            ) : (
              eventsSorted.map((ev) => (
                <Card
                  key={ev._id}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: 1,
                    borderColor: "divider",
                    borderLeftWidth: 4,
                    borderLeftColor: "primary.main",
                    overflow: "hidden",
                  }}
                >
                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      alignItems: { sm: "flex-start" },
                      p: { xs: 2, sm: 2.5 },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {new Date(ev.startsAt).toLocaleString("es-CL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mt: 0.5, mb: 1 }}>
                        {ev.title}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mb: 1.5 }}>
                        <Chip size="small" label={kindLabelAdmin(ev.kind)} variant="outlined" />
                        <Chip size="small" label={gameLabelAdmin(ev.game)} variant="outlined" />
                        {ev.kind === "tournament" && ev.game === "pokemon" && ev.pokemonSubtype ? (
                          <Chip size="small" label={ev.pokemonSubtype} color="primary" variant="outlined" />
                        ) : null}
                      </Stack>
                      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ typography: "body2", color: "text.secondary" }}>
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
                      <Button
                        size="medium"
                        variant="outlined"
                        startIcon={<Groups />}
                        sx={{ mt: 2, fontWeight: 600 }}
                        onClick={() => setParticipantsModalEventId(ev._id)}
                      >
                        Preinscritos
                        {(ev.participants?.length ?? 0) > 0
                          ? ` (${ev.participants?.length})`
                          : ""}
                      </Button>
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ alignSelf: { xs: "flex-end", sm: "flex-start" } }}>
                      <Tooltip title="Editar evento">
                        <IconButton
                          aria-label="Editar"
                          color="primary"
                          onClick={() => openEdit(ev)}
                          size="medium"
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
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        )}
      </Container>

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
              {editing ? "Editar evento" : "Nuevo evento"}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={400}>
              Fecha, tipo de actividad, precio si aplica y datos para el cartel público.
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
            <Box>
              <Typography variant="overline" color="primary" fontWeight={800} sx={{ display: "block", mb: 1 }}>
                General
              </Typography>
              <Stack spacing={2}>
            <TextField
              label="Título"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Inicio"
              type="datetime-local"
              value={form.startsAtLocal}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsAtLocal: e.target.value }))
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel id="kind-label">Tipo</InputLabel>
              <Select
                labelId="kind-label"
                label="Tipo"
                value={form.kind}
                onChange={(e) => {
                  const kind = e.target.value as FormState["kind"];
                  setForm((f) => ({
                    ...f,
                    kind,
                    pokemonSubtype:
                      kind === "tournament" && f.game === "pokemon"
                        ? f.pokemonSubtype || "casual"
                        : "",
                  }));
                }}
              >
                <MenuItem value="tournament">Torneo</MenuItem>
                <MenuItem value="trade_day">Jornada de intercambio</MenuItem>
                <MenuItem value="other">Otro</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="game-label">Juego / comunidad</InputLabel>
              <Select
                labelId="game-label"
                label="Juego / comunidad"
                value={form.game}
                onChange={(e) => {
                  const game = e.target.value as FormState["game"];
                  setForm((f) => ({
                    ...f,
                    game,
                    pokemonSubtype:
                      f.kind === "tournament" && game === "pokemon"
                        ? f.pokemonSubtype || "casual"
                        : "",
                  }));
                }}
              >
                <MenuItem value="pokemon">Pokémon</MenuItem>
                <MenuItem value="magic">Magic</MenuItem>
                <MenuItem value="other_tcg">Otro TCG</MenuItem>
              </Select>
            </FormControl>
            {form.kind === "tournament" && form.game === "pokemon" ? (
              <FormControl fullWidth>
                <InputLabel id="pk-label">Torneo Pokémon</InputLabel>
                <Select
                  labelId="pk-label"
                  label="Torneo Pokémon"
                  value={form.pokemonSubtype || "casual"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pokemonSubtype: e.target.value as FormState["pokemonSubtype"],
                    }))
                  }
                >
                  <MenuItem value="casual">Casual</MenuItem>
                  <MenuItem value="cup">Cup</MenuItem>
                  <MenuItem value="challenge">Challenge</MenuItem>
                </Select>
              </FormControl>
            ) : null}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="primary" fontWeight={800} sx={{ display: "block", mb: 1 }}>
                Precio y cupo
              </Typography>
              <Stack spacing={2}>
            {form.kind === "tournament" ? (
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.gratis}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gratis: e.target.checked }))
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priceClp: e.target.value }))
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
              onChange={(e) =>
                setForm((f) => ({ ...f, maxParticipants: e.target.value }))
              }
              fullWidth
            />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="primary" fontWeight={800} sx={{ display: "block", mb: 1 }}>
                Textos para el público
              </Typography>
              <Stack spacing={2}>
            <TextField
              label="Formato / rondas"
              value={form.formatNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, formatNotes: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Premios"
              value={form.prizesNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, prizesNotes: e.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Ubicación"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              fullWidth
            />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
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

      <Dialog
        open={Boolean(participantsModalEventId && participantsModalEvent)}
        onClose={() => setParticipantsModalEventId(null)}
        fullWidth
        maxWidth="md"
        scroll="paper"
        aria-labelledby="preinscritos-dialog-title"
      >
        <DialogTitle id="preinscritos-dialog-title">
          <Stack spacing={0.5}>
            <Typography component="span" variant="h6" fontWeight={800}>
              Preinscritos
            </Typography>
            {participantsModalEvent ? (
              <Typography variant="body2" color="text.secondary" fontWeight={400}>
                {participantsModalEvent.title}
              </Typography>
            ) : null}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {participantsModalEvent ? (
            <>
              <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2 }}>
                Toca el ícono de check para confirmar o cancelar la asistencia en tienda. POP ID
                viene del perfil del usuario.
              </Alert>
              {confirmParticipation.isError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {confirmParticipation.error instanceof Error
                    ? confirmParticipation.error.message
                    : "Error"}
                </Alert>
              ) : null}
              {participantsModalEvent.participants.length === 0 ? (
                <Typography color="text.secondary">No hay preinscritos.</Typography>
              ) : (
                <Grid container spacing={2}>
                  {participantsModalEvent.participants.map((p, idx) => (
                    <Grid key={`${p.userId ?? "sin-usuario"}-${idx}`} size={{ xs: 6, md: 3 }}>
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
                              if (!participantsModalEvent || !p.userId) return;
                              try {
                                await confirmParticipation.mutateAsync({
                                  eventId: participantsModalEvent._id,
                                  userId: p.userId,
                                  confirmed: !p.confirmed,
                                });
                              } catch {
                                /* error en estado */
                              }
                            }}
                            aria-label={
                              p.confirmed
                                ? "Quitar confirmación"
                                : "Confirmar participación"
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
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
          <Button variant="contained" onClick={() => setParticipantsModalEventId(null)} sx={{ fontWeight: 700 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
