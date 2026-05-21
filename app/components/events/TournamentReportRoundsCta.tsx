'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import ChevronRight from '@mui/icons-material/ChevronRight'
import EditNote from '@mui/icons-material/EditNote'

type Props = {
  eventId: string
}

/**
 * CTA hacia la bitácora de rondas del torneo (`/dashboard/torneos-semana/[id]`).
 */
export default function TournamentReportRoundsCta({ eventId }: Props) {
  const href = `/dashboard/torneos-semana/${eventId}`

  return (
    <Box
      sx={t => ({
        p: { xs: 1.75, sm: 2 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: alpha(t.palette.secondary.main, 0.28),
        background: `linear-gradient(145deg, ${alpha(t.palette.secondary.main, 0.1)} 0%, ${alpha(t.palette.secondary.main, 0.03)} 52%, ${alpha(t.palette.background.paper, 0.92)} 100%)`,
        boxShadow: `0 14px 36px -18px ${alpha(t.palette.secondary.dark, 0.2)}`,
        transition:
          'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 18px 44px -14px ${alpha(t.palette.secondary.dark, 0.28)}`
        }
      })}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={t => ({
              width: 44,
              height: 44,
              borderRadius: 2,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(t.palette.secondary.main, 0.12),
              border: '1px solid',
              borderColor: alpha(t.palette.secondary.main, 0.2),
              color: 'secondary.main'
            })}
          >
            <EditNote sx={{ fontSize: 26 }} aria-hidden />
          </Box>
          <Box sx={{ minWidth: 0, pt: 0.15 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.25
              }}
            >
              Tus rondas
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.35, lineHeight: 1.45 }}
            >
              Registra rivales, resultados y sprites del mazo que enfrentaste.
              Es tu bitácora personal.
            </Typography>
          </Box>
        </Stack>
        <Button
          component={Link}
          href={href}
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          endIcon={<ChevronRight aria-hidden />}
          sx={{
            fontWeight: 800,
            textTransform: 'none',
            py: 1.15,
            boxShadow: 'none',
            transition:
              'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
            '&:hover': {
              boxShadow: t =>
                `0 8px 24px -8px ${alpha(t.palette.secondary.dark, 0.4)}`
            },
            '&:active': {
              transform: 'translateY(1px) scale(0.99)'
            }
          }}
        >
          Reportar rondas
        </Button>
      </Stack>
    </Box>
  )
}
