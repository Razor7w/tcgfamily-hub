'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ContentCopy from '@mui/icons-material/ContentCopy'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PreconCountdown from '@/components/precon/PreconCountdown'
import {
  alertPreconTimerEnded,
  armPreconTimerAlert
} from '@/lib/precon-timer-alert'
import {
  PRECON_TIMER_MAX_MINUTES,
  PRECON_TIMER_MIN_MINUTES,
  preconTimerStatusLabel,
  type PreconTimerSnapshot
} from '@/lib/precon-timer'

type TimerResponse = PreconTimerSnapshot & { error?: string }

export default function PreconRoundTimer({ round }: { round: number | null }) {
  const [snapshot, setSnapshot] = useState<PreconTimerSnapshot | null>(null)
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())
  const [minutes, setMinutes] = useState('50')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const minutesTouched = useRef(false)
  const pending = useRef(false)

  const apply = useCallback((next: PreconTimerSnapshot) => {
    setSnapshot(next)
    setFetchedAt(Date.now())
    if (!minutesTouched.current) setMinutes(String(next.minutes))
  }, [])

  const load = useCallback(async () => {
    if (pending.current) return
    try {
      const response = await fetch('/api/admin/precon/timer', {
        cache: 'no-store'
      })
      const data = (await response.json()) as TimerResponse
      if (!response.ok) {
        setError(data.error ?? 'No se pudo cargar el reloj.')
        return
      }
      apply(data)
    } catch {
      setError('No se pudo cargar el reloj.')
    }
  }, [apply])

  useEffect(() => {
    void load()
  }, [load])

  const send = async (action: 'start' | 'pause' | 'resume' | 'reset') => {
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/precon/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          minutes: Number(minutes),
          round
        })
      })
      const data = (await response.json()) as TimerResponse
      if (!response.ok) {
        setError(data.error ?? 'No se pudo actualizar el reloj.')
        return
      }
      minutesTouched.current = false
      apply(data)
    } catch {
      setError('No se pudo actualizar el reloj.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  const publicUrl =
    snapshot && typeof window !== 'undefined'
      ? `${window.location.origin}/precon/${snapshot.token}`
      : ''

  const copyLink = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar el enlace.')
    }
  }

  const status = snapshot?.status ?? 'idle'

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mt: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>Reloj de la ronda</Typography>
          <Typography variant="body2" color="text.secondary">
            Escribe los minutos y pulsa iniciar. La página pública muestra la
            misma cuenta regresiva.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <TextField
              label="Minutos"
              type="number"
              size="small"
              value={minutes}
              onChange={event => {
                minutesTouched.current = true
                setMinutes(event.target.value)
              }}
              helperText={`${PRECON_TIMER_MIN_MINUTES} a ${PRECON_TIMER_MAX_MINUTES}`}
              sx={{ width: 140 }}
              slotProps={{
                htmlInput: {
                  min: PRECON_TIMER_MIN_MINUTES,
                  max: PRECON_TIMER_MAX_MINUTES,
                  step: 1
                }
              }}
            />
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => {
                armPreconTimerAlert()
                void send('start')
              }}
            >
              Iniciar
            </Button>
            {status === 'running' ? (
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => void send('pause')}
              >
                Pausar
              </Button>
            ) : null}
            {status === 'paused' ? (
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => void send('resume')}
              >
                Reanudar
              </Button>
            ) : null}
            {status !== 'idle' ? (
              <Button
                color="inherit"
                disabled={busy}
                onClick={() => void send('reset')}
              >
                Reiniciar
              </Button>
            ) : null}
          </Stack>
        </Stack>
        <Stack spacing={0.5} sx={{ alignItems: { sm: 'flex-end' } }}>
          {snapshot ? (
            <PreconCountdown
              snapshot={snapshot}
              fetchedAt={fetchedAt}
              onExpire={() => alertPreconTimerEnded(snapshot.startedAt)}
            />
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: '2.5rem' }}>
              --:--
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {preconTimerStatusLabel(status)}
            {snapshot?.round ? ` · Ronda ${snapshot.round}` : ''}
          </Typography>
        </Stack>
      </Stack>
      {publicUrl ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mt: 2, alignItems: { sm: 'center' } }}
        >
          <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
            {publicUrl}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopy />}
            onClick={() => void copyLink()}
          >
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
        </Stack>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}
    </Paper>
  )
}
