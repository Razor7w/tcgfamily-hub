'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { clean } from 'rut.js'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'
import { useMailRegisterQuota, useRegisterMail } from '@/hooks/useMails'
import { MAIL_REGISTER_DAILY_LIMIT } from '@/lib/mail-register-constants'

const OBS_MAX = 2000

const REGISTER_MAIL_HELP_TEXT =
  'Ingresa el RUT del receptor. El correo quedará como pendiente de ingreso en tienda hasta que la tienda lo confirme. Se generará un código único: úsalo para identificar el envío en tienda y, una vez ingresado el paquete, para solicitar o retirar con el mismo código.'

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

  const [helpAnchor, setHelpAnchor] = useState<HTMLElement | null>(null)

  const handleClose = () => {
    setHelpAnchor(null)
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
      <DialogTitle
        id="register-mail-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          pr: 1,
          pb: 1.5
        }}
      >
        <Typography
          component="span"
          variant="h6"
          sx={{ flex: 1, fontWeight: 700 }}
        >
          Registrar correo
        </Typography>
        <IconButton
          size="small"
          aria-label="Información sobre registrar correo"
          aria-expanded={Boolean(helpAnchor)}
          onClick={e => setHelpAnchor(e.currentTarget)}
          edge="end"
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Popover
        open={Boolean(helpAnchor)}
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { maxWidth: 340, p: 2 }
          }
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.55 }}
        >
          {REGISTER_MAIL_HELP_TEXT}
        </Typography>
      </Popover>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
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
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: { xs: 0, sm: 1 }
        }}
      >
        <Stack
          spacing={1.5}
          sx={{
            width: '100%',
            display: { xs: 'flex', sm: 'none' }
          }}
        >
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Button
              fullWidth
              onClick={handleClose}
              disabled={registerMail.isPending || quotaLoading}
              sx={{ py: 1 }}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={handleSubmit}
              variant="contained"
              disabled={
                registerMail.isPending ||
                quotaLoading ||
                quotaError ||
                quotaBlocked
              }
              sx={{ py: 1, fontWeight: 700 }}
            >
              {registerMail.isPending ? 'Registrando…' : 'Registrar'}
            </Button>
          </Stack>
          <Button
            component={Link}
            href="/dashboard/mail/registrar-multiples"
            onClick={handleClose}
            color="primary"
            fullWidth
            variant="text"
            disabled={registerMail.isPending || quotaLoading}
            sx={{ fontWeight: 700 }}
          >
            Cargar múltiples
          </Button>
        </Stack>

        <Button
          component={Link}
          href="/dashboard/mail/registrar-multiples"
          onClick={handleClose}
          color="primary"
          disabled={registerMail.isPending || quotaLoading}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        >
          Cargar múltiples
        </Button>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            gap: 1,
            flexWrap: 'wrap',
            ml: 'auto'
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
