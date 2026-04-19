'use client'

import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'

import DashboardModuleRouteGate from '@/components/dashboard/DashboardModuleRouteGate'
import WeeklyEventsSectionSkeleton from '@/components/events/WeeklyEventsSectionSkeleton'
import { alpha } from '@mui/material'

const WeeklyEventsSection = dynamic(
  () => import('@/components/events/WeeklyEventsSection'),
  { loading: () => <WeeklyEventsSectionSkeleton /> }
)

export default function EventosSemanaPage() {
  return (
    <DashboardModuleRouteGate moduleId="weeklyEvents">
      <Box
        sx={{
          minHeight: '100dvh',
          background: t =>
            `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
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
