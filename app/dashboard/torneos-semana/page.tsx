"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import DashboardModuleRouteGate from "@/components/dashboard/DashboardModuleRouteGate";
import TournamentWeekReportSection from "@/components/events/TournamentWeekReportSection";
import WeekAnchorToolbar from "@/components/events/WeekAnchorToolbar";

export default function TorneosSemanaPage() {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());

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
            <Typography variant="h4" component="h1" fontWeight={700}>
              Tus torneos de la semana
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              Resumen informativo de los torneos en los que participas: estado, récord y
              posición cuando la tabla final esté publicada.
            </Typography>
          </Stack>

          <WeekAnchorToolbar
            weekAnchor={weekAnchor}
            onWeekAnchorChange={setWeekAnchor}
          />

          <TournamentWeekReportSection weekAnchor={weekAnchor} />
        </Container>
      </Box>
    </DashboardModuleRouteGate>
  );
}
