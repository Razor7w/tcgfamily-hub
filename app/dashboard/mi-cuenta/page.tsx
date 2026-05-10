'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { useSession } from 'next-auth/react'
import DashboardHomeContent from '@/components/dashboard/DashboardHomeContent'
import { DASHBOARD_SECTION_COPY } from '@/lib/dashboard-module-config'
import { alpha } from '@mui/material/styles'

export default function MiCuentaDashboardPage() {
  const { data: session } = useSession()

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: 4
      })}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Mi cuenta
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Hola {session?.user?.name ?? ''}.
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.5, maxWidth: 680, lineHeight: 1.6 }}
          >
            {DASHBOARD_SECTION_COPY.player.description}
          </Typography>
        </Box>

        <DashboardHomeContent variant="mi-cuenta" />
      </Container>
    </Box>
  )
}
