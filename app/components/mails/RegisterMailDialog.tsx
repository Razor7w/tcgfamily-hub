'use client'

import { useMemo, useState } from 'react'
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
import { useRegisterMail } from '@/hooks/useMails'

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
  const [rut, setRut] = useState('')
  const [observations, setObservations] = useState('')
  const [touched, setTouched] = useState(false)

  const handleClose = () => {
    setRut('')
    setObservations('')
    setTouched(false)
    registerMail.reset()
    onClose()
  }

  const rutError = useMemo(() => {
    if (!touched) return null
    return getRutFieldError(rut, true)
  }, [rut, touched])

  const handleSubmit = async () => {
    setTouched(true)
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
              setTouched(true)
              setRut(formatRutOnBlur(rut))
            }}
            error={!!rutError}
            helperText={rutError ?? undefined}
            size="small"
            autoComplete="off"
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
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={registerMail.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={registerMail.isPending}
        >
          {registerMail.isPending ? 'Registrando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
