'use client'

import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import { validatePopidOptional } from '@/lib/rut-chile'
import { formatRutOnBlur, getRutFieldError, onlyDigits } from '@/lib/rut-input'

type Props = {
  open: boolean
  onComplete: (data: { rut: string; popid: string }) => Promise<void>
  initialRut?: string
  initialPopid?: string
}

export default function OAuthOnboardingModal({
  open,
  onComplete,
  initialRut,
  initialPopid
}: Props) {
  const [rut, setRut] = useState('')
  const [popid, setPopid] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setRut(initialRut?.trim() ?? '')
    setPopid(initialPopid?.trim() ?? '')
    setError(null)
  }, [open, initialRut, initialPopid])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const rutErr = getRutFieldError(rut, true)
    if (rutErr) {
      setError(rutErr)
      return
    }
    const popidErr = validatePopidOptional(popid)
    if (popidErr) {
      setError(popidErr)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/me/oauth-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: formatRutOnBlur(rut), popid })
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        rut?: string
        popid?: string
      }
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar.')
        return
      }
      await onComplete({
        rut: data.rut ?? '',
        popid: data.popid ?? ''
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      onClose={() => {}}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Completa tu perfil</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Iniciaste sesión con Google. Para continuar necesitamos tu RUT
            (obligatorio) y, si quieres, tu Pop ID.
          </Typography>
          {error ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          ) : null}
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}
          >
            <TextField
              label="RUT"
              name="rut"
              autoComplete="off"
              value={rut}
              onChange={e => setRut(e.target.value)}
              onBlur={() => setRut(formatRutOnBlur(rut))}
              disabled={loading}
              required
              fullWidth
              placeholder="12.345.678-9"
              error={
                Boolean(rut.trim()) && getRutFieldError(rut, true) !== null
              }
              helperText={
                getRutFieldError(rut, true) ??
                (!rut.trim()
                  ? 'Obligatorio. Formato chileno con dígito verificador.'
                  : undefined)
              }
              inputProps={{ maxLength: 20 }}
            />
            <TextField
              label="Pop ID"
              name="popid"
              autoComplete="off"
              value={popid}
              onChange={e => setPopid(onlyDigits(e.target.value, 64))}
              disabled={loading}
              fullWidth
              helperText="Opcional. Solo números."
              error={
                Boolean(popid.trim()) && validatePopidOptional(popid) !== null
              }
              inputProps={{
                maxLength: 64,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={
              loading ||
              getRutFieldError(rut, true) !== null ||
              validatePopidOptional(popid) !== null
            }
            fullWidth
          >
            {loading ? 'Guardando…' : 'Guardar y continuar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
