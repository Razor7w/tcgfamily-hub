"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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

/**
 * Crear torneo Pokémon personal (nombre y fecha) sin depender del calendario de la tienda.
 */
export default function ReportCustomTournamentDialog({
  open,
  onClose,
  weekAnchor,
  onCreated,
}: ReportCustomTournamentDialogProps) {
  const createTournament = useCreateCustomTournament();
  const [title, setTitle] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    defaultStartsAtIsoForWeek(weekAnchor),
  );

  useEffect(() => {
    if (open) {
      setStartsAtLocal(defaultStartsAtIsoForWeek(weekAnchor));
    }
  }, [open, weekAnchor]);

  const handleClose = useCallback(() => {
    if (!createTournament.isPending) onClose();
  }, [createTournament.isPending, onClose]);

  const handleSubmit = () => {
    const t = title.trim();
    if (!t) return;
    const iso = new Date(startsAtLocal);
    if (Number.isNaN(iso.getTime())) return;
    createTournament.mutate(
      { title: t, startsAt: iso.toISOString() },
      {
        onSuccess: (data) => {
          onCreated(data.eventId);
          setTitle("");
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Reportar torneo custom</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Registra un torneo que no esté en el calendario de la tienda. Tu récord W‑L‑T se
            calculará solo con las rondas que reportes (hasta 20). Aparecerá en el listado de la
            semana donde caiga la fecha elegida (usa el selector de semana arriba si no lo ves).
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
          disabled={createTournament.isPending || !title.trim()}
        >
          Crear y abrir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
