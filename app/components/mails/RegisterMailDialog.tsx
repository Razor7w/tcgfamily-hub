'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from '@mui/material'
import { clean } from 'rut.js'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'
import { useMailRegisterQuota, useRegisterMail } from '@/hooks/useMails'
import { MAIL_REGISTER_DAILY_LIMIT } from '@/lib/mail-register-constants'

const OBS_MAX = 2000

export type RegisterMailDialogProps = {
  open: boolean
  onClose: () => void
}

function normalizeRutForApi(input: string) {
  const raw = input.trim()
  if (!raw) return ''
  try {
    return clean(raw)
  } catch {
    return raw
  }
}

export default function RegisterMailDialog({
  open,
  onClose
}: RegisterMailDialogProps) {
  const registerMail = useRegisterMail()
  const {
    data: quota,
    isLoading: quotaLoading,
    isError: quotaError
  } = useMailRegisterQuota()
  const remaining = quota?.remaining ?? 0
  const limit = quota?.limit ?? MAIL_REGISTER_DAILY_LIMIT
  const usedToday = quota?.usedToday ?? 0
  const quotaBlocked = !quotaLoading && remaining <= 0

  const [rut, setRut] = useState('')
  const [observations, setObservations] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const handleClose = () => {
    setRut('')
    setObservations('')
    setSubmitAttempted(false)
    registerMail.reset()
    onClose()
  }

  const rutError = useMemo(() => {
    const t = rut.trim()
    if (!t) {
      return submitAttempted ? getRutFieldError(rut, true) : null
    }
    return getRutFieldError(rut, false)
  }, [rut, submitAttempted])

  const handleSubmit = async () => {
    setSubmitAttempted(true)
    if (getRutFieldError(rut, true)) return
    await registerMail.mutateAsync({
      toRut: normalizeRutForApi(rut),
      observations: observations.trim() || undefined,
      mode: 'onlyReceptor'
    })
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      aria-labelledby="register-mail-title"
    >
      <DialogTitle id="register-mail-title">Registrar correo</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Ingresa el RUT del receptor. El correo quedará como{' '}
            <strong>pendiente de ingreso en tienda</strong> hasta que la tienda
            lo confirme. Se generará un <strong>código único</strong>: úsalo
            para identificar el envío en tienda y, una vez ingresado el paquete,
            para <strong>solicitar o retirar</strong> con el mismo código.
          </Typography>

          <TextField
            label="RUT receptor"
            placeholder="12.345.678-5"
            value={rut}
            onChange={e => {
              setRut(e.target.value)
            }}
            onBlur={() => {
              setRut(prev => formatRutOnBlur(prev))
            }}
            error={!!rutError}
            helperText={
              rutError ??
              (quotaError
                ? 'No se pudo verificar tu cupo. Recarga e inténtalo de nuevo.'
                : quotaBlocked
                  ? `Límite diario alcanzado (${limit} correos/día, hora Chile).`
                  : !quotaLoading
                    ? `Cupo hoy: ${usedToday}/${limit} — te quedan ${remaining}.`
                    : undefined)
            }
            size="small"
            autoComplete="off"
            disabled={quotaBlocked || quotaLoading}
            inputProps={{ maxLength: 20, inputMode: 'text' }}
          />

          <TextField
            label="Comentarios (opcional)"
            placeholder="Ej. descripción del envío…"
            value={observations}
            onChange={e => setObservations(e.target.value.slice(0, OBS_MAX))}
            multiline
            minRows={3}
            size="small"
            fullWidth
            disabled={quotaBlocked || quotaLoading}
            helperText={`${observations.length}/${OBS_MAX}`}
            inputProps={{ maxLength: OBS_MAX }}
          />

          {registerMail.isError && (
            <Alert severity="error">
              {registerMail.error instanceof Error
                ? registerMail.error.message
                : 'Error al registrar correo'}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1
        }}
      >
        <Button
          component={Link}
          href="/dashboard/mail/registrar-multiples"
          onClick={handleClose}
          color="primary"
          disabled={registerMail.isPending || quotaLoading}
        >
          Cargar múltiples
        </Button>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            ml: { xs: 0, sm: 'auto' }
          }}
        >
          <Button
            onClick={handleClose}
            disabled={registerMail.isPending || quotaLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              registerMail.isPending ||
              quotaLoading ||
              quotaError ||
              quotaBlocked
            }
          >
            {registerMail.isPending ? 'Registrando…' : 'Registrar'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
