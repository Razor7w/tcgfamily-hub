'use client'

import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import { validatePopidOptional } from '@/lib/rut-chile'
import { formatRutOnBlur, getRutFieldError, onlyDigits } from '@/lib/rut-input'
import PublicStoreSelectField, {
  type PublicStoreOption
} from '@/components/auth/PublicStoreSelectField'

export type OAuthOnboardingResult = {
  rut: string
  popid: string
  defaultStoreId: string
}

type Props = {
  open: boolean
  onComplete: (data: OAuthOnboardingResult) => Promise<void>
  initialRut?: string
  initialPopid?: string
  initialDefaultStoreId?: string | null
}

function isMongoObjectIdHex(s: string | undefined | null): boolean {
  return typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s.trim())
}

export default function OAuthOnboardingModal({
  open,
  onComplete,
  initialRut,
  initialPopid,
  initialDefaultStoreId
}: Props) {
  const [rut, setRut] = useState('')
  const [popid, setPopid] = useState('')
  const [stores, setStores] = useState<PublicStoreOption[]>([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [defaultStoreId, setDefaultStoreId] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStoresLoading(true)
      try {
        const res = await fetch('/api/public/stores')
        const data = (await res.json().catch(() => ({}))) as {
          stores?: PublicStoreOption[]
        }
        const list = Array.isArray(data.stores) ? data.stores : []
        if (!cancelled) setStores(list)
      } finally {
        if (!cancelled) setStoresLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setRut(initialRut?.trim() ?? '')
    setPopid(initialPopid?.trim() ?? '')
    setError(null)
  }, [open, initialRut, initialPopid])

  useEffect(() => {
    if (stores.length === 0) return
    const ids = new Set(stores.map(s => s.id))
    const initial = initialDefaultStoreId?.trim() ?? ''
    setDefaultStoreId(prev => {
      if (prev && ids.has(prev)) return prev
      if (initial && ids.has(initial)) return initial
      return stores[0]!.id
    })
  }, [stores, initialDefaultStoreId])

  const storeOk = useMemo(() => {
    const sid = defaultStoreId.trim()
    return Boolean(sid && stores.some(s => s.id === sid))
  }, [defaultStoreId, stores])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

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

    const sid = defaultStoreId.trim()
    if (!sid || !stores.some(s => s.id === sid)) {
      setError('Debes elegir una tienda de preferencia.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/me/oauth-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: formatRutOnBlur(rut),
          popid,
          defaultStoreId: sid
        })
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        rut?: string
        popid?: string
        defaultStoreId?: string
      }
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar.')
        return
      }
      const outSid = data.defaultStoreId?.trim() ?? sid
      await onComplete({
        rut: data.rut ?? '',
        popid: data.popid ?? '',
        defaultStoreId: isMongoObjectIdHex(outSid) ? outSid : sid
      })
    } finally {
      setLoading(false)
    }
  }

  const rutOk = getRutFieldError(rut, true) === null
  const popOk = validatePopidOptional(popid) === null
  const canSubmit =
    !loading && rutOk && popOk && storeOk && !storesLoading && stores.length > 0

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      onClose={() => {}}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Completa tu perfil</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Iniciaste sesión con Google. Para continuar necesitamos tu RUT
            (obligatorio), una tienda de preferencia (obligatoria) y, si
            quieres, tu Pop ID.
          </Typography>
          {error ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          ) : null}
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}
          >
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
              error={
                Boolean(rut.trim()) && getRutFieldError(rut, true) !== null
              }
              helperText={
                getRutFieldError(rut, true) ??
                (!rut.trim()
                  ? 'Obligatorio. Formato chileno con dígito verificador.'
                  : undefined)
              }
              inputProps={{ maxLength: 20 }}
            />
            <PublicStoreSelectField
              value={defaultStoreId}
              onChange={setDefaultStoreId}
              options={stores}
              loading={storesLoading}
              disabled={loading}
              required
              labelId="oauth-onboarding-store-label"
              selectId="oauth-onboarding-store"
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
              inputProps={{
                maxLength: 64,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit}
            fullWidth
          >
            {loading ? 'Guardando…' : 'Guardar y continuar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
