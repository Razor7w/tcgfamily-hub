"use client";

import EmojiEvents from "@mui/icons-material/EmojiEvents";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useMyTournamentsWeekReport } from "@/hooks/useWeeklyEvents";
import type { MyTournamentWeekItem } from "@/lib/my-tournament-week-types";
import type { WeeklyEventState } from "@/models/WeeklyEvent";

function stateLabel(s: WeeklyEventState): string {
  if (s === "schedule") return "Programado";
  if (s === "running") return "En curso";
  return "Finalizado";
}

function stateColor(
  s: WeeklyEventState,
): "default" | "primary" | "success" | "warning" {
  if (s === "schedule") return "default";
  if (s === "running") return "warning";
  return "success";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function placementSummary(t: MyTournamentWeekItem): string {
  if (t.state !== "close") {
    if (t.state === "running") {
      const r = t.myMatchRecord;
      if (r && (r.wins > 0 || r.losses > 0 || r.ties > 0)) {
        return `Récord ${r.wins}-${r.losses}-${r.ties} (al publicar la tabla verás tu puesto)`;
      }
      return "Clasificación al cerrar el torneo";
    }
    return "Aún no hay resultado final";
  }
  if (!t.placement) {
    return "Tabla publicada; no figuras en posiciones o DNF";
  }
  if (t.placement.isDnf) {
    return `${t.placement.categoryLabel} · DNF`;
  }
  if (t.placement.place != null && t.placement.place > 0) {
    return `${t.placement.categoryLabel} · ${t.placement.place}º lugar`;
  }
  return t.placement.categoryLabel;
}

type TournamentWeekReportSectionProps = {
  weekAnchor: Date;
};

/**
 * Resumen informativo de torneos en los que el usuario participa en la semana seleccionada.
 * Visible solo cuando el módulo «Eventos de la semana» está activo (misma visibilidad).
 */
export default function TournamentWeekReportSection({
  weekAnchor,
}: TournamentWeekReportSectionProps) {
  const { data, isPending, isError, error, refetch } =
    useMyTournamentsWeekReport(weekAnchor);

  const list = data?.tournaments ?? [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        avatar={<EmojiEvents color="primary" />}
        title="Tu semana en torneos"
        subheader="Participaciones y posición cuando el torneo está cerrado y la tabla fue publicada"
        slotProps={{ title: { variant: "h6" } }}
      />
      <CardContent sx={{ pt: 0 }}>
        {isPending ? (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          >
            {error instanceof Error ? error.message : "No se pudo cargar el reporte"}
          </Alert>
        ) : list.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No estás inscrito en torneos de esta semana. Cuando te preinscribas en un torneo,
            aparecerá aquí con el estado y tu posición al cerrarse.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {list.map((t) => (
              <Stack
                key={t.eventId}
                spacing={0.75}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "action.hover",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    {t.title}
                  </Typography>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Chip
                      size="small"
                      label={stateLabel(t.state)}
                      color={stateColor(t.state)}
                      variant={t.state === "close" ? "filled" : "outlined"}
                    />
                    <Button
                      component={Link}
                      href={`/dashboard/torneos-semana/${t.eventId}`}
                      variant="outlined"
                      size="small"
                      sx={{ flexShrink: 0 }}
                    >
                      Ver detalle
                    </Button>
                  </Stack>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {formatWhen(t.startsAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {placementSummary(t)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
