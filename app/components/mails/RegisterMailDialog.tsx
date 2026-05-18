'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Drawer,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
  useTheme
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { clean } from 'rut.js'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'
import { useMeStores } from '@/hooks/useMeStores'
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
  const theme = useTheme()
  const { data: session } = useSession()
  const { data: meStoresRes } = useMeStores()

  /** Misma lógica que Header/SidebarLayout: primer render móvil, luego `md` real. */
  const [isMdUp, setIsMdUp] = useState(false)
  const desktopQuery = useMemo(() => {
    const q = theme.breakpoints.up('md')
    return q.startsWith('@media ') ? q.slice('@media '.length) : q
  }, [theme])
  useEffect(() => {
    const mq = window.matchMedia(desktopQuery)
    const onChange = () => setIsMdUp(mq.matches)
    onChange()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [desktopQuery])

  const activeStoreLabel = useMemo(() => {
    const id =
      typeof session?.user?.activeStoreId === 'string'
        ? session.user.activeStoreId.trim()
        : ''
    if (!id) return 'tu tienda activa'
    const rows = meStoresRes?.stores ?? []
    const hit = rows.find(r => String(r.id ?? '').trim() === id)
    const name = typeof hit?.name === 'string' ? hit.name.trim() : ''
    return name || 'tu tienda activa'
  }, [session, meStoresRes])

  const titleFull = `Registrar correo en ${activeStoreLabel}`

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

  const titleRow = (
    <>
      <Typography
        component="span"
        variant="h6"
        sx={{
          flex: 1,
          fontWeight: 700,
          lineHeight: 1.35,
          textWrap: 'balance'
        }}
      >
        {titleFull}
      </Typography>
      <IconButton
        size="small"
        aria-label="Información sobre registrar correo"
        aria-expanded={Boolean(helpAnchor)}
        onClick={e => setHelpAnchor(e.currentTarget)}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </>
  )

  const drawerTitleRowWrapper = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.75,
        pr: 0.5
      }}
    >
      {titleRow}
    </Box>
  )

  const bodyFields = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        pt: { xs: 0.5, sm: 1 }
      }}
    >
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
  )

  /** Botonera tipo móvil (drawer); también usada como columna xs en dialog. */
  const actionsMobileColumn = (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
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
            registerMail.isPending || quotaLoading || quotaError || quotaBlocked
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
  )

  const popoverHelp = (
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
  )

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open && !isMdUp}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              maxHeight: 'min(92dvh, 640px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            },
            role: 'dialog',
            'aria-modal': true,
            'aria-label': titleFull
          }
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            px: 2,
            pt: 1,
            pb: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              pb: 1
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: 999,
                bgcolor: 'action.disabledBackground'
              }}
              aria-hidden
            />
          </Box>
          {drawerTitleRowWrapper}
        </Box>
        <Box
          component="section"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            px: 2,
            py: 1.75,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          {bodyFields}
        </Box>
        <Box sx={{ flexShrink: 0, px: 2, py: 2 }}>{actionsMobileColumn}</Box>
      </Drawer>

      <Dialog
        open={open && isMdUp}
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
            alignItems: 'flex-start',
            gap: 0.75,
            pb: 1.5,
            pr: { xs: 0.5, sm: 1 }
          }}
        >
          {titleRow}
        </DialogTitle>
        <DialogContent dividers>{bodyFields}</DialogContent>
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

      {popoverHelp}
    </>
  )
}
