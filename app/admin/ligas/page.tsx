"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import { alpha, type Theme } from "@mui/material/styles";
import { ArrowBack, Delete, Edit, OpenInNew } from "@mui/icons-material";
import {
  type AdminLeague,
  useAdminLeagues,
  useCreateAdminLeague,
  useDeleteAdminLeague,
  useUpdateAdminLeague,
} from "@/hooks/useWeeklyEvents";
import { DEFAULT_LEAGUE_POINTS_BY_PLACE } from "@/lib/league-constants";
import {
  LEAGUE_ADMIN_COUNT_BEST_HELPER,
  LEAGUE_ADMIN_INTRO,
} from "@/lib/league-public-copy";

const SLUG_HINT =
  "Solo minúsculas, números y guiones (ej. liga-primavera-2026). Se usa en la URL pública.";

function pointsToCommaList(pts: number[]): string {
  return pts.join(", ");
}

function parseCommaNumbers(s: string): number[] | null {
  const parts = s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 1) return null;
  const out: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0) return null;
    out.push(Math.round(n));
  }
  if (out.length > 32) return null;
  return out;
}

function formFromLeague(l: AdminLeague) {
  return {
    name: l.name,
    slug: l.slug,
    description: l.description ?? "",
    isActive: l.isActive,
    pointsStr: pointsToCommaList(
      Array.isArray(l.pointsByPlace) && l.pointsByPlace.length > 0
        ? l.pointsByPlace
        : [...DEFAULT_LEAGUE_POINTS_BY_PLACE],
    ),
    countBestStr:
      l.countBestEvents != null && l.countBestEvents > 0
        ? String(l.countBestEvents)
        : "",
  };
}

const emptyForm = () => ({
  name: "",
  slug: "",
  description: "",
  isActive: true,
  pointsStr: pointsToCommaList([...DEFAULT_LEAGUE_POINTS_BY_PLACE]),
  countBestStr: "",
});

export default function AdminLigasPage() {
  const { data, isPending, isError, error, refetch } = useAdminLeagues();
  const createLg = useCreateAdminLeague();
  const updateLg = useUpdateAdminLeague();
  const deleteLg = useDeleteAdminLeague();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLeague | null>(null);
  const [form, setForm] = useState(() => emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminLeague | null>(null);

  const leaguesSorted = useMemo(() => {
    const list = data?.leagues ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [data?.leagues]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (lg: AdminLeague) => {
    setEditing(lg);
    setForm(formFromLeague(lg));
    setFormError(null);
    setDialogOpen(true);
  };

  const buildPayload = (): Record<string, unknown> => {
    const name = form.name.trim();
    if (!name) throw new Error("Nombre requerido");
    const slug = form.slug.trim().toLowerCase();
    if (!slug) throw new Error("Slug requerido");
    const pts = parseCommaNumbers(form.pointsStr);
    if (!pts) throw new Error("Puntos por posición inválidos (lista de números separados por coma)");
    const payload: Record<string, unknown> = {
      name,
      slug,
      description: form.description.trim(),
      isActive: form.isActive,
      pointsByPlace: pts,
    };
    const c = form.countBestStr.trim();
    if (c === "") {
      payload.countBestEvents = null;
    } else {
      const n = Math.round(Number(c));
      if (!Number.isFinite(n) || n < 1 || n > 52) {
        throw new Error("Mejores N torneos: vacío (todos) o un número entre 1 y 52");
      }
      payload.countBestEvents = n;
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
        const body = { ...payload };
        delete body.slug;
        await updateLg.mutateAsync({ id: editing._id, body });
      } else {
        await createLg.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {
      /* estado de mutación */
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLg.mutateAsync(deleteTarget._id);
      setDeleteTarget(null);
    } catch {
      /* error en UI */
    }
  };

  const dialogErr =
    formError ??
    (createLg.error instanceof Error
      ? createLg.error.message
      : updateLg.error instanceof Error
        ? updateLg.error.message
        : null);

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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Button
                component={Link}
                href="/admin/eventos"
                variant="outlined"
                size="small"
                startIcon={<ArrowBack />}
                sx={{
                  alignSelf: "flex-start",
                  mb: 1.5,
                  borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.18),
                }}
              >
                Volver a eventos
              </Button>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}
              >
                Ligas (torneos oficiales)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 640, lineHeight: 1.6 }}>
                {LEAGUE_ADMIN_INTRO}
              </Typography>
            </Box>
            <Button variant="contained" size="large" onClick={openCreate} sx={{ fontWeight: 700 }}>
              Nueva liga
            </Button>
          </Stack>

          {isPending ? (
            <Typography color="text.secondary">Cargando…</Typography>
          ) : isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Reintentar
                </Button>
              }
            >
              {error instanceof Error ? error.message : "Error"}
            </Alert>
          ) : leaguesSorted.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, borderStyle: "dashed" }}>
              <Typography fontWeight={700}>Aún no hay ligas</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Crea una liga y luego asígnala a los torneos oficiales desde Eventos.
              </Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={openCreate}>
                Crear liga
              </Button>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {leaguesSorted.map((lg) => (
                <Paper
                  key={lg._id}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: (t) => alpha(t.palette.text.primary, 0.08),
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
                        {lg.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        /ligas/{lg.slug}
                        {lg.countBestEvents != null && lg.countBestEvents > 0
                          ? ` · Mejores ${lg.countBestEvents} torneos`
                          : " · Todos los torneos"}
                      </Typography>
                      {!lg.isActive ? (
                        <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                          Inactiva (oculta en la vista pública)
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title="Ver página pública">
                        <IconButton
                          component={Link}
                          href={`/ligas/${encodeURIComponent(lg.slug)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          aria-label="Abrir liga en nueva pestaña"
                        >
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton color="primary" onClick={() => openEdit(lg)} aria-label="Editar">
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton color="error" onClick={() => setDeleteTarget(lg)} aria-label="Eliminar">
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>{editing ? "Editar liga" : "Nueva liga"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {dialogErr ? <Alert severity="error">{dialogErr}</Alert> : null}
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Slug (URL)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              fullWidth
              required
              disabled={Boolean(editing)}
              helperText={SLUG_HINT}
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Puntos por posición (1.º, 2.º, …)"
              value={form.pointsStr}
              onChange={(e) => setForm((f) => ({ ...f, pointsStr: e.target.value }))}
              fullWidth
              helperText="Lista separada por comas. Por defecto similar a una liga local (12, 10, 8…)."
            />
            <TextField
              label="Contar solo los N mejores torneos (opcional)"
              value={form.countBestStr}
              onChange={(e) => setForm((f) => ({ ...f, countBestStr: e.target.value }))}
              fullWidth
              placeholder="Vacío = sumar todos"
              helperText={LEAGUE_ADMIN_COUNT_BEST_HELPER}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
              }
              label="Liga visible (página pública activa)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={createLg.isPending || updateLg.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminar liga</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar &quot;{deleteTarget?.name}&quot;? Solo se puede si ningún evento la usa.
          </Typography>
          {deleteLg.error instanceof Error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteLg.error.message}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()} disabled={deleteLg.isPending}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
