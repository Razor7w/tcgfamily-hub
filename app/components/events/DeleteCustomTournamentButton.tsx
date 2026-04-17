"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useDeleteCustomTournament } from "@/hooks/useWeeklyEvents";

type DeleteCustomTournamentButtonProps = {
  eventId: string;
  tournamentTitle: string;
  /** Tras borrar con éxito (p. ej. `router.push`). Si no se pasa, solo se actualizan las queries. */
  onDeleted?: () => void;
  size?: "small" | "medium" | "large";
  variant?: "text" | "outlined" | "contained";
  label?: string;
};

export default function DeleteCustomTournamentButton({
  eventId,
  tournamentTitle,
  onDeleted,
  size = "medium",
  variant = "outlined",
  label = "Eliminar torneo",
}: DeleteCustomTournamentButtonProps) {
  const [open, setOpen] = useState(false);
  const del = useDeleteCustomTournament();

  const handleConfirm = () => {
    del.mutate(eventId, {
      onSuccess: () => {
        setOpen(false);
        onDeleted?.();
      },
    });
  };

  return (
    <>
      <Button
        color="error"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={del.isPending}
        sx={{ flexShrink: 0 }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!del.isPending) setOpen(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Eliminar torneo custom</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
            Se borrará <strong>{tournamentTitle}</strong> y las rondas que hayas reportado. Esta
            acción no se puede deshacer.
          </Typography>
          {del.isError ? (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {del.error instanceof Error ? del.error.message : "Error al eliminar"}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={del.isPending}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirm}
            disabled={del.isPending}
          >
            {del.isPending ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
