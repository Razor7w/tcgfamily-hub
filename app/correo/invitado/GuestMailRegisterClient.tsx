'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import BrandLogo from '@/components/brand/BrandLogo'
import Header from '@/components/Header'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'
import { clean } from 'rut.js'
import { MAIL_CONTACT_PHONE_MAX } from '@/lib/mail-contact-phone'
import {
  GUEST_MAIL_REGISTER_DAILY_LIMIT,
  GUEST_MAIL_SESSION_LIMIT
} from '@/lib/mail-register-constants'
import type { StoreBranchRow } from '@/lib/store-branch'

const OBS_MAX = 2000

type PublicStore = { id: string; name: string; slug: string }

type GuestSuccess = {
  code: string
  fromRut: string
  toRut: string
  storeName: string
  linkedToAccount: boolean
  remainingToday: number
  limit: number
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

export default function GuestMailRegisterPage() {
  const [stores, setStores] = useState<PublicStore[]>([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [store, setStore] = useState<PublicStore | null>(null)
  const [branches, setBranches] = useState<StoreBranchRow[]>([])
  const [branchRequired, setBranchRequired] = useState(false)
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [branch, setBranch] = useState<StoreBranchRow | null>(null)

  const [fromRut, setFromRut] = useState('')
  const [toRut, setToRut] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [observations, setObservations] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<{
    usedToday: number
    remaining: number
    limit: number
  } | null>(null)
  const [sessionQuota, setSessionQuota] = useState<{
    sessionUsed: number
    sessionRemaining: number
    sessionLimit: number
  } | null>(null)
  const [success, setSuccess] = useState<GuestSuccess | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/mail/guest-quota')
        const data = await res.json()
        if (cancelled || !res.ok) return
        setSessionQuota({
          sessionUsed: data.sessionUsed ?? 0,
          sessionRemaining:
            data.sessionRemaining ?? GUEST_MAIL_SESSION_LIMIT,
          sessionLimit: data.sessionLimit ?? GUEST_MAIL_SESSION_LIMIT
        })
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStoresLoading(true)
      try {
        const res = await fetch('/api/public/stores')
        const data = await res.json()
        if (!cancelled && res.ok) {
          const list = Array.isArray(data.stores)
            ? (data.stores as PublicStore[])
            : []
          setStores(list)
          if (list.length === 1) setStore(list[0]!)
        }
      } catch {
        if (!cancelled) setError('No se pudieron cargar las tiendas')
      } finally {
        if (!cancelled) setStoresLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setBranch(null)
    if (!store?.id) {
      setBranches([])
      setBranchRequired(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setBranchesLoading(true)
      try {
        const res = await fetch(
          `/api/mail/branches?storeId=${encodeURIComponent(store.id)}`
        )
        const data = await res.json()
        if (cancelled || !res.ok) return
        const list = Array.isArray(data.branches)
          ? (data.branches as StoreBranchRow[])
          : []
        setBranches(list)
        setBranchRequired(Boolean(data.required))
        if (list.length === 1) setBranch(list[0]!)
      } catch {
        if (!cancelled) {
          setBranches([])
          setBranchRequired(false)
        }
      } finally {
        if (!cancelled) setBranchesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [store?.id])

  useEffect(() => {
    const rutOk = !getRutFieldError(fromRut, true)
    if (!store?.id || !rutOk || !fromRut.trim()) {
      setQuota(null)
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const sp = new URLSearchParams({
            storeId: store.id,
            fromRut: normalizeRutForApi(fromRut)
          })
          const res = await fetch(`/api/mail/guest-quota?${sp.toString()}`)
          const data = await res.json()
          if (cancelled || !res.ok) return
          setQuota({
            limit: data.limit ?? GUEST_MAIL_REGISTER_DAILY_LIMIT,
            usedToday: data.usedToday ?? 0,
            remaining: data.remaining ?? 0
          })
          if (
            typeof data.sessionUsed === 'number' ||
            typeof data.sessionRemaining === 'number'
          ) {
            setSessionQuota({
              sessionUsed: data.sessionUsed ?? 0,
              sessionRemaining:
                data.sessionRemaining ?? GUEST_MAIL_SESSION_LIMIT,
              sessionLimit: data.sessionLimit ?? GUEST_MAIL_SESSION_LIMIT
            })
          }
        } catch {
          if (!cancelled) setQuota(null)
        }
      })()
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [fromRut, store?.id])

  const fromRutError = useMemo(() => {
    if (!fromRut.trim()) {
      return submitAttempted ? getRutFieldError(fromRut, true) : null
    }
    return getRutFieldError(fromRut, false)
  }, [fromRut, submitAttempted])

  const toRutError = useMemo(() => {
    if (!toRut.trim()) {
      return submitAttempted ? getRutFieldError(toRut, true) : null
    }
    return getRutFieldError(toRut, false)
  }, [toRut, submitAttempted])

  const quotaBlocked = quota != null && quota.remaining <= 0
  const sessionBlocked =
    sessionQuota != null && sessionQuota.sessionRemaining <= 0
  const formBlocked = quotaBlocked || sessionBlocked

  const handleSubmit = async () => {
    setSubmitAttempted(true)
    setError(null)
    if (sessionBlocked) {
      setError(
        `Límite de sesión: máximo ${GUEST_MAIL_SESSION_LIMIT} correos como invitado en este navegador.`
      )
      return
    }
    if (!store?.id) {
      setError('Selecciona una tienda')
      return
    }
    if (getRutFieldError(fromRut, true) || getRutFieldError(toRut, true)) return
    if (branchRequired && !branch?.id) {
      setError('Selecciona una sucursal')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/mail/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromRut: normalizeRutForApi(fromRut),
          toRut: normalizeRutForApi(toRut),
          storeId: store.id,
          ...(branch?.id ? { branchId: branch.id } : {}),
          contactPhone: contactPhone.trim() || undefined,
          observations: observations.trim() || undefined
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (
          typeof data?.sessionUsed === 'number' ||
          typeof data?.sessionRemaining === 'number'
        ) {
          setSessionQuota({
            sessionUsed: data.sessionUsed ?? 0,
            sessionRemaining: data.sessionRemaining ?? 0,
            sessionLimit: data.sessionLimit ?? GUEST_MAIL_SESSION_LIMIT
          })
        }
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'No se pudo registrar'
        )
      }
      const mail = data.mail as GuestSuccess
      if (
        typeof data.sessionUsed === 'number' ||
        typeof data.sessionRemaining === 'number'
      ) {
        setSessionQuota({
          sessionUsed: data.sessionUsed ?? 0,
          sessionRemaining: data.sessionRemaining ?? 0,
          sessionLimit: data.sessionLimit ?? GUEST_MAIL_SESSION_LIMIT
        })
      }
      setSuccess({
        code: mail.code,
        fromRut: mail.fromRut,
        toRut: mail.toRut,
        storeName: mail.storeName,
        linkedToAccount: Boolean(mail.linkedToAccount),
        remainingToday: mail.remainingToday,
        limit: mail.limit
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCode = async () => {
    if (!success?.code) return
    try {
      await navigator.clipboard.writeText(success.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar el código')
    }
  }

  const handleReset = () => {
    setSuccess(null)
    setToRut('')
    setObservations('')
    setContactPhone('')
    setSubmitAttempted(false)
    setError(null)
    setCopied(false)
  }

  return (
    <Box
      sx={t => ({
        minHeight: '100vh',
        bgcolor: 'background.default',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.07)} 0%, ${t.palette.background.default} 42%)`
      })}
    >
      <Header />
      <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
        <Stack spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
          <BrandLogo variant="wordmark" size="md" href="/" />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              textAlign: 'center',
              letterSpacing: '-0.02em'
            }}
          >
            Registrar correo
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ textAlign: 'center', maxWidth: 440 }}
          >
            Sin crear cuenta. Usa tu RUT, genera el código y envíaselo al
            receptor para mostrarlo en la tienda. Máximo{' '}
            {GUEST_MAIL_SESSION_LIMIT} correos por sesión de navegador.
          </Typography>
        </Stack>

        {success ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 3,
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Stack spacing={2.5} alignItems="center">
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48 }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, textAlign: 'center' }}
              >
                Correo registrado
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                En {success.storeName}. Muestra este código en la tienda.
              </Typography>

              <Box
                sx={t => ({
                  width: '100%',
                  py: 2.5,
                  px: 2,
                  borderRadius: 2,
                  bgcolor: alpha(t.palette.primary.main, 0.08),
                  border: `1px dashed ${alpha(t.palette.primary.main, 0.45)}`,
                  textAlign: 'center'
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, letterSpacing: '0.08em' }}
                >
                  CÓDIGO
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.04em',
                    mt: 0.5,
                    wordBreak: 'break-all'
                  }}
                >
                  {success.code}
                </Typography>
              </Box>

              <Alert severity="info" sx={{ width: '100%' }}>
                Sácale captura al código y mándasela al receptor del correo,
                para que lo muestre en la tienda al retirar.
              </Alert>

              {success.linkedToAccount ? (
                <Alert severity="success" sx={{ width: '100%' }}>
                  Este envío quedó vinculado a la cuenta con RUT{' '}
                  {success.fromRut}.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ width: '100%' }}>
                  Si más adelante creas una cuenta con el RUT {success.fromRut},
                  verás este correo en tu panel.
                </Alert>
              )}

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ width: '100%' }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => void handleCopyCode()}
                >
                  {copied ? 'Copiado' : 'Copiar código'}
                </Button>
                <Button fullWidth variant="outlined" onClick={handleReset} disabled={sessionBlocked}>
                  Registrar otro
                </Button>
              </Stack>

              <Button component={Link} href="/auth/register" size="small">
                Crear cuenta para gestionar tus correos
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Stack spacing={2}>
              {error ? (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              ) : null}

              <Autocomplete<PublicStore>
                options={stores}
                loading={storesLoading}
                value={store}
                onChange={(_, v) => setStore(v)}
                getOptionLabel={o => o.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Tienda"
                    required
                    size="small"
                  />
                )}
              />

              {branchRequired || branches.length > 0 ? (
                <Autocomplete<StoreBranchRow>
                  options={branches}
                  loading={branchesLoading}
                  value={branch}
                  onChange={(_, v) => setBranch(v)}
                  getOptionLabel={o =>
                    o.address?.trim() ? `${o.name} · ${o.address}` : o.name
                  }
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Sucursal"
                      required={branchRequired}
                      size="small"
                      error={
                        submitAttempted && branchRequired && !branch?.id
                      }
                    />
                  )}
                />
              ) : null}

              <TextField
                label="Tu RUT (emisor)"
                placeholder="12.345.678-5"
                value={fromRut}
                onChange={e => setFromRut(e.target.value)}
                onBlur={() => setFromRut(prev => formatRutOnBlur(prev))}
                error={!!fromRutError}
                helperText={
                  fromRutError ??
                  [
                    quota
                      ? `Cupo RUT hoy: ${quota.usedToday}/${quota.limit} — quedan ${quota.remaining}`
                      : `Máximo ${GUEST_MAIL_REGISTER_DAILY_LIMIT} correos/día por RUT (hora Chile).`,
                    sessionQuota
                      ? `Sesión navegador: ${sessionQuota.sessionUsed}/${sessionQuota.sessionLimit}`
                      : `Máximo ${GUEST_MAIL_SESSION_LIMIT} por sesión de navegador.`
                  ].join(' · ')
                }
                size="small"
                required
                disabled={submitting || sessionBlocked}
              />

              <TextField
                label="RUT del receptor"
                placeholder="12.345.678-5"
                value={toRut}
                onChange={e => setToRut(e.target.value)}
                onBlur={() => setToRut(prev => formatRutOnBlur(prev))}
                error={!!toRutError}
                helperText={toRutError ?? 'Quién retirará el paquete en tienda.'}
                size="small"
                required
                disabled={submitting || formBlocked}
              />

              <TextField
                label="Número de contacto (opcional)"
                placeholder="+56 9 1234 5678"
                value={contactPhone}
                onChange={e =>
                  setContactPhone(
                    e.target.value.slice(0, MAIL_CONTACT_PHONE_MAX)
                  )
                }
                size="small"
                disabled={submitting || formBlocked}
                inputProps={{ maxLength: MAIL_CONTACT_PHONE_MAX }}
              />

              <TextField
                label="Comentarios (opcional)"
                value={observations}
                onChange={e =>
                  setObservations(e.target.value.slice(0, OBS_MAX))
                }
                multiline
                minRows={2}
                size="small"
                disabled={submitting || formBlocked}
                helperText={`${observations.length}/${OBS_MAX}`}
                inputProps={{ maxLength: OBS_MAX }}
              />

              {sessionBlocked ? (
                <Alert severity="error">
                  Alcanzaste el máximo de {GUEST_MAIL_SESSION_LIMIT} correos
                  como invitado en esta sesión del navegador. Cierra el
                  navegador o <Link href="/auth/register">crea una cuenta</Link>
                  .
                </Alert>
              ) : null}

              {quotaBlocked && !sessionBlocked ? (
                <Alert severity="warning">
                  Sin cupo de invitado por hoy en esta tienda. Vuelve mañana o{' '}
                  <Link href="/auth/register">crea una cuenta</Link>.
                </Alert>
              ) : null}

              <Button
                variant="contained"
                size="large"
                onClick={() => void handleSubmit()}
                disabled={
                  submitting ||
                  storesLoading ||
                  !store ||
                  formBlocked ||
                  (branchRequired && !branch)
                }
                sx={{ fontWeight: 700, py: 1.25 }}
              >
                {submitting ? 'Registrando…' : 'Registrar y mostrar código'}
              </Button>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                ¿Ya tienes cuenta? <Link href="/">Inicia sesión</Link> para
                registrar desde el panel.
              </Typography>
            </Stack>
          </Paper>
        )}
      </Container>
    </Box>
  )
}
