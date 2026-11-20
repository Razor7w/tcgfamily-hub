'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import BrandLogo from '@/components/brand/BrandLogo'
import PreconCountdown from '@/components/precon/PreconCountdown'
import {
  alertPreconTimerEnded,
  armPreconTimerAlert
} from '@/lib/precon-timer-alert'
import {
  preconTimerRemainingMs,
  preconTimerStatusLabel,
  type PreconTimerSnapshot
} from '@/lib/precon-timer'

type TimerResponse = PreconTimerSnapshot & { error?: string }

export default function PublicPreconTimer({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<PreconTimerSnapshot | null>(null)
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`/api/public/precon/${token}`, {
          cache: 'no-store'
        })
        const data = (await response.json()) as TimerResponse
        if (cancelled) return
        if (!response.ok) {
          setSnapshot(null)
          setError(data.error ?? 'Este enlace no existe.')
          return
        }
        setError(null)
        setSnapshot(data)
        setFetchedAt(Date.now())
      } catch {
        if (!cancelled) setError('No se pudo leer el reloj.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const remaining = snapshot
    ? preconTimerRemainingMs(snapshot, fetchedAt, now)
    : 0
  const finished = snapshot?.status === 'running' && remaining === 0
  const statusLine = !snapshot
    ? ''
    : finished
      ? 'Tiempo terminado'
      : snapshot.status === 'idle'
        ? 'La ronda todavía no empieza'
        : preconTimerStatusLabel(snapshot.status)

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        px: 2,
        py: 3,
        display: 'grid',
        alignContent: 'center',
        justifyItems: 'start',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.08)} 0%, ${t.palette.background.default} 46%)`
      })}
    >
      <Stack spacing={2} sx={{ width: 'min(100%, 720px)', mx: 'auto' }}>
        <BrandLogo size="sm" href="/" />
        <Typography variant="overline" color="text.secondary">
          Precon
          {snapshot?.round ? ` · Ronda ${snapshot.round}` : ''}
        </Typography>
        {snapshot ? (
          <PreconCountdown
            snapshot={snapshot}
            fetchedAt={fetchedAt}
            size="lg"
            onExpire={() => alertPreconTimerEnded(snapshot.startedAt)}
          />
        ) : (
          <Typography
            sx={{ fontWeight: 800, fontSize: { xs: '4.5rem', sm: '7.5rem' } }}
          >
            --:--
          </Typography>
        )}
        {finished ? (
          <Alert severity="warning">Tiempo terminado.</Alert>
        ) : statusLine ? (
          <Typography variant="h6" color="text.secondary">
            {statusLine}
          </Typography>
        ) : null}
        {snapshot?.status === 'running' && !finished && !armed ? (
          <Button
            variant="outlined"
            onClick={() => {
              armPreconTimerAlert()
              setArmed(true)
            }}
          >
            Avisarme al terminar
          </Button>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Box>
  )
}
