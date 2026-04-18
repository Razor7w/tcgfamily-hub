"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
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
          <Stack spacing={2.5} sx={{ mb: 2.5 }}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                Tus torneos de la semana
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mt: 1.25, lineHeight: 1.6 }}>
                Elige la semana y separa torneos del calendario de la tienda de los que registras
                como custom. En cada tarjeta verás récord y detalle al abrir la vista completa.
              </Typography>
            </Box>
          </Stack>

          <WeekAnchorToolbar
            weekAnchor={weekAnchor}
            onWeekAnchorChange={setWeekAnchor}
          />

          <TournamentWeekReportSection
            weekAnchor={weekAnchor}
            onOpenCreateCustomDialog={() => setCustomOpen(true)}
          />

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
