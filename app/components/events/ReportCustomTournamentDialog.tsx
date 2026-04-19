"use client";

import { useCallback, useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { startOfWeekMonday } from "@/components/events/weekUtils";
import { useCreateCustomTournament } from "@/hooks/useWeeklyEvents";

type ReportCustomTournamentDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Semana seleccionada en la página: se usa para proponer fecha/hora por defecto. */
  weekAnchor: Date;
  onCreated: (eventId: string) => void;
};

const CATEGORY_OPTIONS = [
  { value: 0, label: "Júnior" },
  { value: 1, label: "Sénior" },
  { value: 2, label: "Máster" },
];

function defaultStartsAtIsoForWeek(weekAnchor: Date): string {
  const monday = startOfWeekMonday(weekAnchor);
  const d = new Date(monday);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

type CreateCustomMutation = ReturnType<typeof useCreateCustomTournament>;

type ReportCustomTournamentFormProps = {
  weekAnchor: Date;
  onClose: () => void;
  onCreated: (eventId: string) => void;
  createTournament: CreateCustomMutation;
};

/**
 * Formulario montado solo mientras el diálogo está abierto: estado inicial fresco por apertura
 * (sin useEffect al abrir).
 */
function ReportCustomTournamentForm({
  weekAnchor,
  onClose,
  onCreated,
  createTournament,
}: ReportCustomTournamentFormProps) {
  const [title, setTitle] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    defaultStartsAtIsoForWeek(weekAnchor),
  );
  const [includePlacement, setIncludePlacement] = useState(false);
  const [categoryIndex, setCategoryIndex] = useState(2);
  const [placeStr, setPlaceStr] = useState("");
  const [placementDnf, setPlacementDnf] = useState(false);

  const handleClose = useCallback(() => {
    if (!createTournament.isPending) onClose();
  }, [createTournament.isPending, onClose]);

  const handleSubmit = () => {
    const t = title.trim();
    if (!t) return;
    const iso = new Date(startsAtLocal);
    if (Number.isNaN(iso.getTime())) return;

    let placement:
      | { categoryIndex: number; place: number | null; isDnf: boolean }
      | undefined;
    if (includePlacement) {
      if (placementDnf) {
        placement = {
          categoryIndex,
          place: null,
          isDnf: true,
        };
      } else {
        const n = Number.parseInt(placeStr.trim(), 10);
        if (!Number.isFinite(n) || n < 1 || n > 999) return;
        placement = {
          categoryIndex,
          place: n,
          isDnf: false,
        };
      }
    }

    createTournament.mutate(
      {
        title: t,
        startsAt: iso.toISOString(),
        ...(placement ? { placement } : {}),
      },
      {
        onSuccess: (data: { ok: boolean; eventId: string }) => {
          onCreated(data.eventId);
          onClose();
        },
      },
    );
  };

  const placeInvalid =
    includePlacement &&
    !placementDnf &&
    (!placeStr.trim() ||
      !Number.isFinite(Number.parseInt(placeStr.trim(), 10)) ||
      Number.parseInt(placeStr.trim(), 10) < 1);

  const canSubmit =
    title.trim() &&
    !createTournament.isPending &&
    (!includePlacement || placementDnf || !placeInvalid);

  return (
    <>
      <DialogTitle>Reportar torneo</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Registra un torneo que no esté en el calendario de la tienda. Tu récord W‑L‑T se
            calculará con las rondas que reportes. Puedes indicar tu posición final.
          </Typography>
          <TextField
            label="Nombre del torneo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="Fecha y hora de inicio"
            type="datetime-local"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ style: { fontVariantNumeric: "tabular-nums" } }}
          />

          <Divider />
          <FormControlLabel
            control={
              <Checkbox
                checked={includePlacement}
                onChange={(e) => setIncludePlacement(e.target.checked)}
              />
            }
            label="Incluir mi posición final"
          />
          {includePlacement ? (
            <Stack spacing={2} sx={{ pl: { xs: 0, sm: 0.5 } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="custom-category-label">Categoría</InputLabel>
                <Select
                  labelId="custom-category-label"
                  label="Categoría"
                  value={categoryIndex}
                  onChange={(e) => setCategoryIndex(Number(e.target.value))}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={placementDnf}
                    onChange={(e) => {
                      setPlacementDnf(e.target.checked);
                      if (e.target.checked) setPlaceStr("");
                    }}
                  />
                }
                label="DNF (no terminé clasificación)"
              />
              <TextField
                label="Puesto"
                type="number"
                value={placeStr}
                onChange={(e) => setPlaceStr(e.target.value)}
                fullWidth
                size="small"
                disabled={placementDnf}
                required={!placementDnf}
                inputProps={{ min: 1, max: 999, style: { fontVariantNumeric: "tabular-nums" } }}
                helperText={
                  placementDnf
                    ? "No aplica puesto numérico con DNF"
                    : "Ej.: 12 para 12º lugar"
                }
              />
            </Stack>
          ) : null}

          {createTournament.isError ? (
            <Typography variant="body2" color="error">
              {createTournament.error instanceof Error
                ? createTournament.error.message
                : "Error al crear"}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={createTournament.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Crear y abrir
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * Crear torneo Pokémon personal (nombre, fecha y posición opcional) sin depender del calendario de la tienda.
 */
export default function ReportCustomTournamentDialog({
  open,
  onClose,
  weekAnchor,
  onCreated,
}: ReportCustomTournamentDialogProps) {
  const createTournament = useCreateCustomTournament();

  const handleClose = useCallback(() => {
    if (!createTournament.isPending) onClose();
  }, [createTournament.isPending, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      {open ? (
        <ReportCustomTournamentForm
          key={weekAnchor.getTime()}
          weekAnchor={weekAnchor}
          onClose={onClose}
          onCreated={onCreated}
          createTournament={createTournament}
        />
      ) : null}
    </Dialog>
  );
}
