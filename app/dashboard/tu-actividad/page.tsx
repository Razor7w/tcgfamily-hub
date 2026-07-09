'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import ChampionshipPointsCard from '@/components/dashboard/ChampionshipPointsCard'
import DashboardHomeContent from '@/components/dashboard/DashboardHomeContent'
import PlayerSeasonSummary from '@/components/dashboard/PlayerSeasonSummary'
import { alpha } from '@mui/material/styles'

export default function TuActividadDashboardPage() {
  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      })}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <PlayerSeasonSummary compact />

        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <ChampionshipPointsCard />
        </Box>

        <DashboardHomeContent variant="tu-actividad" />
      </Container>
    </Box>
  )
}
