'use client'

import { useCallback, useState } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { formatContributionPointsAwardedMessage } from '@/lib/contribution-points-feedback'
import type { ContributionPointsAwardedItem } from '@/lib/contribution-points-public'

export function useContributionAwardSnackbar() {
  const [message, setMessage] = useState<string | null>(null)

  const notifyMessage = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed) setMessage(trimmed)
  }, [])

  const notifyAwarded = useCallback(
    (items?: ContributionPointsAwardedItem[], fallback?: string) => {
      const text =
        formatContributionPointsAwardedMessage(items) ??
        (fallback?.trim() ? fallback.trim() : null)
      if (text) setMessage(text)
    },
    []
  )

  const snackbar = (
    <Snackbar
      open={message != null}
      autoHideDuration={5000}
      onClose={() => setMessage(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="success"
        variant="filled"
        onClose={() => setMessage(null)}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )

  return { notifyAwarded, notifyMessage, snackbar }
}
