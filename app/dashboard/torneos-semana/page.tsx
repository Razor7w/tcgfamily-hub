"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import DashboardModuleRouteGate from "@/components/dashboard/DashboardModuleRouteGate";
import ReportCustomTournamentDialog from "@/components/events/ReportCustomTournamentDialog";
import TournamentWeekReportSection from "@/components/events/TournamentWeekReportSection";
import WeekAnchorToolbar from "@/components/events/WeekAnchorToolbar";

export default function TorneosSemanaPage() {
  const router = useRouter();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <DashboardModuleRouteGate moduleId="weeklyEvents">
      <Box
        sx={{
          minHeight: "100dvh",
          bgcolor: "background.default",
          py: { xs: 2, sm: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "flex-start" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h4" component="h1" fontWeight={700}>
                  Tus torneos de la semana
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mt: 1 }}>
                  Resumen informativo de los torneos en los que participas: estado, récord y
                  posición cuando la tabla final esté publicada.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => setCustomOpen(true)}
                sx={{ flexShrink: 0, textTransform: "none", fontWeight: 600 }}
              >
                Reportar torneo custom
              </Button>
            </Stack>
          </Stack>

          <WeekAnchorToolbar
            weekAnchor={weekAnchor}
            onWeekAnchorChange={setWeekAnchor}
          />

          <TournamentWeekReportSection weekAnchor={weekAnchor} />

          <ReportCustomTournamentDialog
            open={customOpen}
            onClose={() => setCustomOpen(false)}
            weekAnchor={weekAnchor}
            onCreated={(eventId) => {
              router.push(`/dashboard/torneos-semana/${eventId}`);
            }}
          />
        </Container>
      </Box>
    </DashboardModuleRouteGate>
  );
}
