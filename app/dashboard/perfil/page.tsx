'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import {
  getPasswordRuleChecks,
  isPasswordStrengthSatisfied,
  validateRegisterName
} from '@/lib/password-rules'
import { validatePopidOptional } from '@/lib/rut-chile'
import { onlyDigits } from '@/lib/rut-input'
import CheckCircle from '@mui/icons-material/CheckCircle'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'

type MeResponse = {
  id: string
  name: string
  email: string
  rut: string
  popid: string
  phone: string
  hasPassword: boolean
}

export default function PerfilPage() {
  const { data: session, status, update } = useSession()
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [popid, setPopid] = useState('')
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwErr, setPwErr] = useState<string | null>(null)
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) {
          if (!cancelled) setLoadError('No se pudo cargar el perfil')
          return
        }
        const data = (await res.json()) as MeResponse
        if (!cancelled) {
          setMe(data)
          setName(data.name)
          setPopid(data.popid)
          setLoadError(null)
        }
      } catch {
        if (!cancelled) setLoadError('No se pudo cargar el perfil')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
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

  const canSaveProfile = useMemo(() => {
    if (!me || savingProfile) return false
    if (validateRegisterName(name) !== null) return false
    if (validatePopidOptional(popid) !== null) return false
    return (
      name.trim() !== me.name.trim() || popid.trim() !== (me.popid || '').trim()
    )
  }, [me, name, popid, savingProfile])

  const canSavePassword = useMemo(() => {
    if (!me?.hasPassword || savingPw) return false
    if (!currentPassword) return false
    if (!newPwOk || !confirmPwOk) return false
    return true
  }, [me, currentPassword, newPwOk, confirmPwOk, savingPw])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileErr(null)
    setProfileMsg(null)
    const nameErr = validateRegisterName(name)
    if (nameErr) {
      setProfileErr(nameErr)
      return
    }
    const popErr = validatePopidOptional(popid)
    if (popErr) {
      setProfileErr(popErr)
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), popid })
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        name?: string
        popid?: string
      }
      if (!res.ok) {
        setProfileErr(data.error || 'No se pudo guardar.')
        return
      }
      setMe(prev =>
        prev
          ? {
              ...prev,
              name: data.name ?? prev.name,
              popid: data.popid ?? prev.popid
            }
          : prev
      )
      setProfileMsg('Datos actualizados.')
      await update({
        name: data.name ?? name.trim(),
        popid:
          data.popid !== undefined && data.popid !== null
            ? data.popid
            : popid.trim().slice(0, 64)
      })
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwErr(null)
    setPwMsg(null)
    setSavingPw(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword: confirmNew
        })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setPwErr(data.error || 'No se pudo cambiar la contraseña.')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNew('')
      setPwMsg('Contraseña actualizada.')
      await update({ hasPassword: true })
    } finally {
      setSavingPw(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session?.user) {
    return null
  }

  if (loadError || !me) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{loadError || 'Sin datos'}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
        Perfil
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Modifica tu nombre y Pop ID. El correo y el RUT solo los puede cambiar
        un administrador; aquí siguen visibles.
      </Typography>

      <Paper
        component="form"
        onSubmit={saveProfile}
        elevation={2}
        sx={{ p: 3, mb: 3 }}
      >
        <Typography variant="h6" gutterBottom>
          Datos personales
        </Typography>
        {profileMsg ? (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setProfileMsg(null)}
          >
            {profileMsg}
          </Alert>
        ) : null}
        {profileErr ? (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setProfileErr(null)}
          >
            {profileErr}
          </Alert>
        ) : null}
        <Stack spacing={2}>
          <TextField
            label="Correo electrónico"
            value={me.email}
            disabled
            fullWidth
            helperText="Solo lectura. Contacta a un administrador para cambiarlo."
          />
          <TextField
            label="RUT"
            value={me.rut}
            disabled
            fullWidth
            helperText="Solo lectura. Contacta a un administrador para cambiarlo."
          />
          <TextField
            label="Nombre"
            name="name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={savingProfile}
            required
            fullWidth
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label="Pop ID"
            name="popid"
            value={popid}
            onChange={e => setPopid(onlyDigits(e.target.value, 64))}
            disabled={savingProfile}
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
          <Button
            type="submit"
            variant="contained"
            disabled={!canSaveProfile}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {savingProfile ? 'Guardando…' : 'Guardar datos'}
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Contraseña
        </Typography>
        {!me.hasPassword ? (
          <Alert severity="info">
            Iniciaste sesión con Google y no tienes contraseña local. Para usar
            correo y contraseña, el administrador puede ayudarte o puedes
            registrarte con correo si aún no tienes cuenta.
          </Alert>
        ) : (
          <Box component="form" onSubmit={savePassword}>
            {pwMsg ? (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
                onClose={() => setPwMsg(null)}
              >
                {pwMsg}
              </Alert>
            ) : null}
            {pwErr ? (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setPwErr(null)}
              >
                {pwErr}
              </Alert>
            ) : null}
            <Stack spacing={2}>
              <TextField
                label="Contraseña actual"
                type={showCur ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                disabled={savingPw}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showCur ? 'Ocultar contraseña' : 'Mostrar contraseña'
                        }
                        onClick={() => setShowCur(v => !v)}
                        edge="end"
                      >
                        {showCur ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label="Nueva contraseña"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={savingPw}
                fullWidth
                inputProps={{ maxLength: 128 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'
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
                  pl: 0.5,
                  py: 1,
                  px: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover'
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
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
                          sx={{
                            fontSize: 20,
                            mt: '2px',
                            color: 'success.main'
                          }}
                        />
                      ) : (
                        <RadioButtonUnchecked
                          sx={{
                            fontSize: 20,
                            mt: '2px',
                            color: 'action.disabled'
                          }}
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
                        sx={{
                          fontSize: 20,
                          mt: '2px',
                          color: 'action.disabled'
                        }}
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
                label="Confirmar nueva contraseña"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmNew}
                onChange={e => setConfirmNew(e.target.value)}
                disabled={savingPw}
                fullWidth
                inputProps={{ maxLength: 128 }}
              />
              <Divider />
              <Button
                type="submit"
                variant="outlined"
                disabled={!canSavePassword}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
              >
                {savingPw ? 'Actualizando…' : 'Actualizar contraseña'}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  )
}
