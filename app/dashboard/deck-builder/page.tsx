'use client'

import { Suspense } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import DeckBuilderClient from '@/dashboard/deck-builder/DeckBuilderClient'

export default function DeckBuilderPage() {
  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        bgcolor: 'background.default',
        backgroundImage: [
          `radial-gradient(ellipse 80% 50% at 10% -10%, ${alpha(t.palette.primary.main, 0.12)} 0%, transparent 55%)`,
          `radial-gradient(ellipse 60% 40% at 100% 0%, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 50%)`
        ].join(', '),
        py: { xs: 2, sm: 3 }
      })}
    >
      <Container maxWidth="lg">
        <Suspense
          fallback={
            <Stack alignItems="center" py={8}>
              <CircularProgress />
            </Stack>
          }
        >
          <DeckBuilderClient />
        </Suspense>
      </Container>
    </Box>
  )
}
