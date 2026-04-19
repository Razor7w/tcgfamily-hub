'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { EventAvailable } from '@mui/icons-material'

export default function WeeklyEventsWeekEmptyPanel() {
  return (
    <Stack
      alignItems="flex-start"
      spacing={1.25}
      sx={{
        py: 4,
        px: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px dashed',
        borderColor: t => alpha(t.palette.text.primary, 0.12),
        bgcolor: t => alpha(t.palette.text.primary, 0.02)
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: t => alpha(t.palette.text.primary, 0.06),
            color: 'text.secondary'
          }}
        >
          <EventAvailable sx={{ fontSize: 22 }} />
        </Box>
        <Box>
          <Typography
            color="text.primary"
            fontWeight={700}
            sx={{ letterSpacing: '-0.02em' }}
          >
            No hay eventos esta semana
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.25, maxWidth: 360 }}
          >
            Cambia de día en la fila superior o navega a otra semana.
          </Typography>
        </Box>
      </Stack>
    </Stack>
  )
}
