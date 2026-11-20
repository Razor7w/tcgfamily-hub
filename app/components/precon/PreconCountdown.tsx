'use client'

import { useEffect, useRef, useState } from 'react'
import Typography from '@mui/material/Typography'
import {
  formatPreconCountdown,
  preconTimerRemainingMs,
  type PreconTimerSnapshot
} from '@/lib/precon-timer'

export default function PreconCountdown({
  snapshot,
  fetchedAt,
  size = 'md',
  onExpire
}: {
  snapshot: PreconTimerSnapshot
  fetchedAt: number
  size?: 'md' | 'lg'
  onExpire?: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const sawTimeLeft = useRef(false)
  const expired = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const remaining = preconTimerRemainingMs(snapshot, fetchedAt, now)

  useEffect(() => {
    if (snapshot.status !== 'running') {
      sawTimeLeft.current = false
      expired.current = false
      return
    }
    if (remaining > 0) {
      sawTimeLeft.current = true
      expired.current = false
      return
    }
    if (!sawTimeLeft.current || expired.current) return
    expired.current = true
    onExpire?.()
  }, [onExpire, remaining, snapshot.status])
  const finished = snapshot.status === 'running' && remaining === 0
  const urgent =
    snapshot.status === 'running' && remaining > 0 && remaining <= 5 * 60_000

  return (
    <Typography
      component="p"
      sx={{
        m: 0,
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        fontSize: size === 'lg' ? { xs: '4.5rem', sm: '7.5rem' } : '2.5rem',
        color: finished
          ? 'error.main'
          : urgent
            ? 'warning.main'
            : 'text.primary'
      }}
    >
      {formatPreconCountdown(remaining)}
    </Typography>
  )
}
