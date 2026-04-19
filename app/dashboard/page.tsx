'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { useSession } from 'next-auth/react'
import DashboardHomeContent from '@/components/dashboard/DashboardHomeContent'
import { alpha } from '@mui/material/styles'

export default function DashboardPage() {
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
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          Hola {session && session.user.name}
        </Typography>

        <DashboardHomeContent />
      </Container>
    </Box>
  )
}
