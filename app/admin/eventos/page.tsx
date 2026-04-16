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
import IconButton from "@mui/material/IconButton";
import { ArrowBack, Delete, Edit } from "@mui/icons-material";
import Link from "next/link";
import {
  AdminWeeklyEvent,
  useAdminEvents,
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

  const [dialogOpen, setDialogOpen] = useState(false);
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="md">
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Button
            component={Link}
            href="/admin"
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
          >
            Volver
          </Button>
          <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
            Eventos de la semana
          </Typography>
          <Button variant="contained" onClick={openCreate}>
            Nuevo evento
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define torneos (con precio en CLP o gratuitos), jornadas de intercambio u otros
          eventos. En torneos Pokémon elige Casual, Cup o Challenge. El cupo es numérico
          (por ejemplo 4, 8, 16 o 32).
        </Typography>

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
              <Typography color="text.secondary">
                No hay eventos. Crea uno para la semana.
              </Typography>
            ) : (
              eventsSorted.map((ev) => (
                <Card key={ev._id} variant="outlined">
                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      alignItems: { sm: "flex-start" },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {ev.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(ev.startsAt).toLocaleString("es-CL", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {ev.kind === "tournament"
                          ? "Torneo"
                          : ev.kind === "trade_day"
                            ? "Intercambio"
                            : "Otro"}{" "}
                        ·{" "}
                        {ev.game === "pokemon"
                          ? "Pokémon"
                          : ev.game === "magic"
                            ? "Magic"
                            : "Otro TCG"}
                        {ev.kind === "tournament" &&
                        ev.game === "pokemon" &&
                        ev.pokemonSubtype
                          ? ` · ${ev.pokemonSubtype}`
                          : ""}
                      </Typography>
                      <Typography variant="body2">
                        Precio:{" "}
                        {ev.kind === "tournament"
                          ? ev.priceClp > 0
                            ? `${ev.priceClp.toLocaleString("es-CL")} CLP`
                            : "Gratis"
                          : "—"}{" "}
                        · Cupo: {ev.maxParticipants} · Preinscritos:{" "}
                        {ev.participants?.length ?? 0}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        aria-label="Editar"
                        color="primary"
                        onClick={() => openEdit(ev)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        aria-label="Eliminar"
                        color="error"
                        onClick={() => setDeleteTarget(ev)}
                      >
                        <Delete />
                      </IconButton>
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
        aria-labelledby="event-dialog-title"
      >
        <DialogTitle id="event-dialog-title">
          {editing ? "Editar evento" : "Nuevo evento"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={createEv.isPending || updateEv.isPending}
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
  );
}
