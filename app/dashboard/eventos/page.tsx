"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

import WeeklyEventsSection from "@/components/events/WeeklyEventsSection";

export default function EventosSemanaPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg">
        <WeeklyEventsSection showSeeAllLink={false} />
      </Container>
    </Box>
  );
}
