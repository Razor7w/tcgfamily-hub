'use client'

import { useMemo, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import CircularProgress from '@mui/material/CircularProgress'
import AppVersion from '@/components/AppVersion'
import Header from '@/components/Header'
import {
  getPasswordRuleChecks,
  isPasswordStrengthSatisfied,
  normalizeEmail,
  validateEmailFormat,
  validatePasswordStrength,
  validateRegisterName
} from '@/lib/password-rules'
import { validatePopidOptional } from '@/lib/rut-chile'
import {
  formatRutOnBlur,
  getRutFieldError,
  onlyDigits
} from '@/lib/rut-input'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rut, setRut] = useState('')
  const [popid, setPopid] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordRuleChecks = useMemo(
    () => getPasswordRuleChecks(password),
    [password]
  )

  const passwordsMatch =
    password.length > 0 &&
    confirm.length > 0 &&
    password === confirm

  const formChecklist = useMemo(
    () => [
      ...passwordRuleChecks,
      {
        key: 'passwordsMatch',
        label: 'Ambas contraseñas deben coincidir',
        ok: passwordsMatch
      }
    ],
    [passwordRuleChecks, passwordsMatch]
  )

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (validateRegisterName(name) !== null) return false
    if (validateEmailFormat(normalizeEmail(email)) !== null) return false
    if (getRutFieldError(rut, true) !== null) return false
    if (validatePopidOptional(popid) !== null) return false
    if (!isPasswordStrengthSatisfied(password)) return false
    if (!passwordsMatch) return false
    return true
  }, [loading, name, email, rut, popid, password, passwordsMatch])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const nameErr = validateRegisterName(name)
    if (nameErr) {
      setError(nameErr)
      return
    }

    const em = normalizeEmail(email)
    const emailErr = validateEmailFormat(em)
    if (emailErr) {
      setError(emailErr)
      return
    }

    const passErr = validatePasswordStrength(password)
    if (passErr) {
      setError(passErr)
      return
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: em,
          rut: formatRutOnBlur(rut),
          popid,
          password,
          confirmPassword: confirm
        })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        setError(data.error || 'No se pudo registrar la cuenta.')
        return
      }

      const sign = await signIn('credentials', {
        email: em,
        password,
        redirect: false,
        callbackUrl: '/dashboard'
      })
      if (sign?.error) {
        router.replace('/?registered=1')
        return
      }
      if (sign?.url) {
        window.location.href = sign.url
      } else {
        router.replace('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Header />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 440,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <Typography
            component="h1"
            variant="h5"
            fontWeight={600}
            color="primary"
          >
            Crear cuenta
          </Typography>
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            noValidate
          >
            <TextField
              label="Nombre"
              name="name"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              required
              fullWidth
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Correo electrónico"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
              fullWidth
              inputProps={{ maxLength: 254 }}
            />
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
              error={Boolean(rut.trim()) && getRutFieldError(rut, true) !== null}
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
              inputProps={{ maxLength: 64, inputMode: 'numeric', pattern: '[0-9]*' }}
            />
            <TextField
              label="Contraseña"
              type={showPw ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            <Box
              sx={{
                pl: 0.5,
                py: 1,
                px: 1.5,
                borderRadius: 1,
                bgcolor: 'action.hover'
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Contraseña y confirmación
              </Typography>
              <Box
                component="ul"
                sx={{
                  m: 0,
                  pl: 0,
                  listStyle: 'none',
                  '& li': { display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.35 }
                }}
              >
                {formChecklist.map(rule => (
                  <Box key={rule.key} component="li">
                    {rule.ok ? (
                      <CheckCircle
                        sx={{ fontSize: 20, mt: '2px', color: 'success.main' }}
                        aria-hidden
                      />
                    ) : (
                      <RadioButtonUnchecked
                        sx={{ fontSize: 20, mt: '2px', color: 'action.disabled' }}
                        aria-hidden
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
              </Box>
            </Box>
            <TextField
              label="Confirmar contraseña"
              type={showPw ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
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
              sx={{ py: 1.5, textTransform: 'none' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Registrarse'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            ¿Ya tienes cuenta?{' '}
            <Link href="/" style={{ fontWeight: 600 }}>
              Iniciar sesión
            </Link>
          </Typography>
        </Paper>
      </Box>
      <Box component="footer" sx={{ py: 2, textAlign: 'center' }}>
        <AppVersion />
      </Box>
    </Box>
  )
}
