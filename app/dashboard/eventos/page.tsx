'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'

import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import WeeklyEventsSection from '@/components/events/WeeklyEventsSection'

export default function EventosSemanaPage() {
  return (
    <DashboardModuleRouteGate moduleId="weeklyEvents">
      <Box
        sx={{
          minHeight: '100dvh',
          bgcolor: 'background.default',
          py: { xs: 2, sm: 4 }
        }}
      >
        <Container maxWidth="lg">
          <WeeklyEventsSection showSeeAllLink={false} />
        </Container>
      </Box>
    </DashboardModuleRouteGate>
  )
}
