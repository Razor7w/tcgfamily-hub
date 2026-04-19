'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { CalendarMonth, OpenInNew } from '@mui/icons-material'
import Link from 'next/link'

export default function WeeklyEventsSectionHeader({
  showSeeAllLink
}: {
  showSeeAllLink: boolean
}) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        pt: { xs: 2.5, sm: 3 },
        pb: { xs: 2, sm: 2.25 },
        borderBottom: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.06),
        bgcolor: t => alpha(t.palette.text.primary, 0.02)
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
        justifyContent="space-between"
        gap={2}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          gap={1.5}
          sx={{ minWidth: 0, flex: 1 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2.5,
              flexShrink: 0,
              color: 'primary.main',
              bgcolor: t => alpha(t.palette.primary.main, 0.1),
              border: '1px solid',
              borderColor: t => alpha(t.palette.primary.main, 0.2),
              boxShadow: t =>
                `inset 0 1px 0 ${alpha(t.palette.common.white, 0.45)}`
            }}
          >
            <CalendarMonth aria-hidden sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0, pt: 0.25 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: 'text.primary'
              }}
            >
              Eventos de la semana
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: 'block',
                mt: 0.75,
                lineHeight: 1.5,
                maxWidth: { sm: '42ch' }
              }}
            >
              Elige día y horario; aquí ves el cartel, cupos y tu inscripción.
            </Typography>
          </Box>
        </Stack>
        {showSeeAllLink ? (
          <Button
            component={Link}
            href="/dashboard/eventos"
            size="medium"
            color="primary"
            variant="outlined"
            endIcon={<OpenInNew sx={{ fontSize: 18 }} />}
            sx={{
              flexShrink: 0,
              fontWeight: 600,
              borderColor: t => alpha(t.palette.primary.main, 0.35),
              alignSelf: { xs: 'stretch', sm: 'flex-start' }
            }}
          >
            Vista completa
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
