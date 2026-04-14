'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { normalizeEmail, validateEmailFormat } from '@/lib/password-rules'

export default function EmailPasswordSignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  function validateForm(): boolean {
    const next: { email?: string; password?: string } = {}
    const em = normalizeEmail(email)
    const eErr = validateEmailFormat(em)
    if (eErr) next.email = eErr
    if (!password) next.password = 'La contraseña es obligatoria.'
    else if (password.length > 128)
      next.password = 'La contraseña no puede superar 128 caracteres.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validateForm()) return

    const em = normalizeEmail(email)

    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email: em,
        password,
        redirect: false,
        callbackUrl: '/dashboard'
      })
      if (res?.error) {
        setError('Correo o contraseña incorrectos.')
        return
      }
      if (res?.url) {
        window.location.href = res.url
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
      noValidate
    >
      <Typography variant="h6" component="h2" fontWeight={600}>
        Iniciar sesión con correo
      </Typography>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <TextField
        label="Correo electrónico"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        error={Boolean(fieldErrors.email)}
        helperText={fieldErrors.email}
        disabled={loading}
        required
        fullWidth
        inputProps={{ maxLength: 254 }}
      />
      <TextField
        label="Contraseña"
        type={showPw ? 'text' : 'password'}
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={Boolean(fieldErrors.password)}
        helperText={fieldErrors.password}
        disabled={loading}
        required
        fullWidth
        inputProps={{ maxLength: 128 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={
                  showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                onClick={() => setShowPw(v => !v)}
                edge="end"
              >
                {showPw ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={loading}
        sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }}
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </Button>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        ¿No tienes cuenta?{' '}
        <Link href="/auth/register" style={{ fontWeight: 600 }}>
          Crear cuenta
        </Link>
      </Typography>
    </Box>
  )
}
