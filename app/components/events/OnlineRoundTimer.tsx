'use client'

import { useSyncExternalStore } from 'react'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import {
  formatRoundTimerRemaining,
  type OnlineRoundTimerPayload
} from '@/lib/online-round-timer'

type Props = {
  timer: OnlineRoundTimerPayload | null | undefined
  /** `compact` para cabeceras admin; `card` para vista jugador. */
  variant?: 'compact' | 'card'
}

function subscribeToClock(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000)
  return () => window.clearInterval(id)
}

function getClockSnapshot() {
  return Date.now()
}

export default function OnlineRoundTimer({
  timer,
  variant = 'compact'
}: Props) {
  const theme = useTheme()
  const active = Boolean(timer?.endsAt)
  const now = useSyncExternalStore(
    onStoreChange => (active ? subscribeToClock(onStoreChange) : () => {}),
    getClockSnapshot,
    getClockSnapshot
  )

  if (!timer) return null
  const startedMs = new Date(timer.startedAt).getTime()
  const endsMs = new Date(timer.endsAt).getTime()
  const totalMs = Math.max(1, endsMs - startedMs)
  const remainingMs = Math.max(0, endsMs - now)
  const expired = now >= endsMs
  const progress = expired
    ? 100
    : Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100))
  const urgent = !expired && remainingMs <= 5 * 60_000

  const color = expired ? 'error' : urgent ? 'warning' : 'primary'

  if (variant === 'card') {
    return (
      <Alert
        severity={expired ? 'error' : urgent ? 'warning' : 'info'}
        icon={<AccessTimeIcon />}
        variant="outlined"
        sx={{ borderRadius: 2.5 }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            Ronda {timer.roundNum} · {timer.minutes} min por ronda
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em',
              lineHeight: 1.1
            }}
          >
            {expired
              ? 'Tiempo agotado'
              : formatRoundTimerRemaining(remainingMs)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={color}
            sx={{ height: 6, borderRadius: 999 }}
          />
          <Typography variant="caption" color="text.secondary">
            {expired
              ? 'La ronda sigue abierta hasta que el staff avance o cierren las mesas.'
              : 'Tiempo restante para jugar y reportar el resultado.'}
          </Typography>
        </Stack>
      </Alert>
    )
  }

  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: t => alpha(t.palette[color].main, 0.35),
        bgcolor: t => alpha(t.palette[color].main, 0.06)
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AccessTimeIcon fontSize="small" color={color} />
          <Typography variant="subtitle2" fontWeight={700}>
            Ronda {timer.roundNum}
          </Typography>
          <Chip
            size="small"
            label={`${timer.minutes} min`}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            fontVariantNumeric: 'tabular-nums',
            color: theme.palette[color].main
          }}
        >
          {expired ? 'Tiempo agotado' : formatRoundTimerRemaining(remainingMs)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={color}
        sx={{ mt: 1, height: 5, borderRadius: 999 }}
      />
    </Box>
  )
}
