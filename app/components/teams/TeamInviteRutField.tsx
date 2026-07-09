'use client'

import { useMemo, useState } from 'react'
import TextField from '@mui/material/TextField'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'

type TeamInviteRutFieldProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string | null
}

export default function TeamInviteRutField({
  value,
  onChange,
  disabled,
  error: externalError
}: TeamInviteRutFieldProps) {
  const [touched, setTouched] = useState(false)

  const validationError = useMemo(() => {
    if (!touched && !value.trim()) return null
    return getRutFieldError(value, true)
  }, [touched, value])

  const displayError = externalError ?? validationError

  return (
    <TextField
      label="RUT del jugador"
      placeholder="12.345.678-9"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={() => {
        setTouched(true)
        onChange(formatRutOnBlur(value))
      }}
      disabled={disabled}
      fullWidth
      required
      error={Boolean(displayError)}
      helperText={
        displayError ??
        'Si el jugador ya tiene cuenta, recibirá la solicitud en Notificaciones. Si no, quedará pendiente hasta que se registre.'
      }
      inputProps={{ inputMode: 'text', autoComplete: 'off' }}
    />
  )
}

export function isTeamInviteRutValid(raw: string): boolean {
  return getRutFieldError(raw, true) == null
}
