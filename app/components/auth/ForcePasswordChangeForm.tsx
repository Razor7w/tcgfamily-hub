'use client'

import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import CheckCircle from '@mui/icons-material/CheckCircle'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import {
  getPasswordRuleChecks,
  isPasswordStrengthSatisfied
} from '@/lib/password-rules'
import {
  clearTempPasswordHint,
  readTempPasswordHint
} from '@/lib/temp-password-hint'

type Props = {
  onSuccess: () => Promise<void>
}

export default function ForcePasswordChangeForm({ onSuccess }: Props) {
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [showTemp, setShowTemp] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hint = readTempPasswordHint()
    if (hint) setTemporaryPassword(hint)
  }, [])

  const newPwChecks = useMemo(
    () => getPasswordRuleChecks(newPassword),
    [newPassword]
  )
  const newPwOk = useMemo(
    () => isPasswordStrengthSatisfied(newPassword),
    [newPassword]
  )
  const confirmPwOk =
    newPassword.length > 0 &&
    confirmNew.length > 0 &&
    newPassword === confirmNew

  const canSubmit =
    !loading &&
    Boolean(temporaryPassword.trim()) &&
    newPwOk &&
    confirmPwOk &&
    newPassword !== temporaryPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) {
      if (newPassword === temporaryPassword) {
        setError('La nueva contraseña debe ser distinta de la temporal.')
      }
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: temporaryPassword,
          newPassword,
          confirmNewPassword: confirmNew
        })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar la contraseña.')
        return
      }
      clearTempPasswordHint()
      await onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={2}
      sx={{
        width: '100%',
        maxWidth: 480,
        p: { xs: 2.5, sm: 3 },
        borderRadius: 2
      }}
    >
      <Typography variant="h5" component="h1" fontWeight={800} gutterBottom>
        Nueva contraseña obligatoria
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Un administrador restableció tu acceso con una contraseña temporal.
        Antes de continuar, elige una contraseña nueva y distinta.
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          id="force-password-temporary"
          name="temporaryPassword"
          label="Contraseña temporal actual"
          type={showTemp ? 'text' : 'password'}
          autoComplete="current-password"
          value={temporaryPassword}
          onChange={e => setTemporaryPassword(e.target.value)}
          disabled={loading}
          required
          fullWidth
          helperText="La que usaste para entrar (o la que te dio el administrador)."
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showTemp
                      ? 'Ocultar contraseña temporal'
                      : 'Mostrar contraseña temporal'
                  }
                  onClick={() => setShowTemp(v => !v)}
                  edge="end"
                >
                  {showTemp ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <TextField
          id="force-password-new"
          name="newPassword"
          label="Nueva contraseña"
          type={showNew ? 'text' : 'password'}
          autoComplete="new-password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          disabled={loading}
          required
          fullWidth
          inputProps={{ maxLength: 128 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showNew
                      ? 'Ocultar nueva contraseña'
                      : 'Mostrar nueva contraseña'
                  }
                  onClick={() => setShowNew(v => !v)}
                  edge="end"
                >
                  {showNew ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <Box
          sx={{
            py: 1,
            px: 1.5,
            borderRadius: 1,
            bgcolor: 'action.hover'
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Requisitos de la nueva contraseña
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
            {newPwChecks.map(rule => (
              <Box
                key={rule.key}
                component="li"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  py: 0.35
                }}
              >
                {rule.ok ? (
                  <CheckCircle
                    sx={{ fontSize: 20, mt: '2px', color: 'success.main' }}
                  />
                ) : (
                  <RadioButtonUnchecked
                    sx={{ fontSize: 20, mt: '2px', color: 'action.disabled' }}
                  />
                )}
                <Typography
                  component="span"
                  variant="body2"
                  color={rule.ok ? 'success.dark' : 'text.secondary'}
                >
                  {rule.label}
                </Typography>
              </Box>
            ))}
            <Box
              component="li"
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                py: 0.35
              }}
            >
              {confirmPwOk ? (
                <CheckCircle
                  sx={{ fontSize: 20, mt: '2px', color: 'success.main' }}
                />
              ) : (
                <RadioButtonUnchecked
                  sx={{ fontSize: 20, mt: '2px', color: 'action.disabled' }}
                />
              )}
              <Typography
                component="span"
                variant="body2"
                color={confirmPwOk ? 'success.dark' : 'text.secondary'}
              >
                La confirmación coincide con la nueva contraseña
              </Typography>
            </Box>
          </Box>
        </Box>
        <TextField
          id="force-password-confirm"
          name="confirmNewPassword"
          label="Repetir nueva contraseña"
          type={showNew ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmNew}
          onChange={e => setConfirmNew(e.target.value)}
          disabled={loading}
          required
          fullWidth
          inputProps={{ maxLength: 128 }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!canSubmit}
          sx={{ mt: 0.5, py: 1.25, textTransform: 'none', fontWeight: 700 }}
        >
          {loading ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
      </Box>
    </Paper>
  )
}
