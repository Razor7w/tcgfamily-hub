'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import DeckBuilderClient from '@/dashboard/deck-builder/DeckBuilderClient'

export default function DeckBuilderPage() {
  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${t.palette.primary.main}14 0%, ${t.palette.background.default} 42%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 3 }
      })}
    >
      <Container maxWidth="lg">
        <DeckBuilderClient />
      </Container>
    </Box>
  )
}
