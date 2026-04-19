'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { clean } from 'rut.js'
import { formatRutOnBlur, getRutFieldError } from '@/lib/rut-input'
import { useMailRegisterQuota, type MailRegisterQuota } from '@/hooks/useMails'

const OBS_MAX = 2000
/** Máximo de filas en el formulario (la cuota diaria puede ser menor). */
const MAX_ROWS = 25

async function fetchMailRegisterQuota(): Promise<MailRegisterQuota> {
  const response = await fetch('/api/mail/register-quota')
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      typeof err.error === 'string' ? err.error : 'Error al cargar cuota'
    )
  }
  return response.json()
}

export type MailRow = {
  id: string
  rut: string
  observations: string
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

function normalizeRutKey(input: string): string {
  try {
    return clean(input.trim()).toUpperCase()
  } catch {
    return input.trim().toUpperCase()
  }
}

export default function RegisterMultipleMailsForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const batchProgressAnchorRef = useRef<HTMLDivElement>(null)
  const [submittingBatch, setSubmittingBatch] = useState(false)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchProcessed, setBatchProcessed] = useState(0)
  const [batchOk, setBatchOk] = useState(0)
  const [batchProgressPct, setBatchProgressPct] = useState(0)

  useEffect(() => {
    if (!submittingBatch) return
    const id = window.setTimeout(() => {
      batchProgressAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [submittingBatch])

  const {
    data: quota,
    isLoading: quotaLoading,
    isError: quotaError
  } = useMailRegisterQuota()
  const remaining = quota?.remaining ?? 0
  const limit = quota?.limit ?? 10
  const usedToday = quota?.usedToday ?? 0

  const maxRowsAllowed = useMemo(() => {
    if (quotaLoading) return 1
    if (remaining <= 0) return 1
    return Math.min(MAX_ROWS, remaining)
  }, [quotaLoading, remaining])

  const [rows, setRows] = useState<MailRow[]>([
    { id: crypto.randomUUID(), rut: '', observations: '' }
  ])
  const [submitSummary, setSubmitSummary] = useState<{
    ok: number
    errors: string[]
  } | null>(null)

  /** Validación en vivo: solo muestra error si hay texto (no exige blur). */
  const liveRutError = useCallback((rut: string) => {
    const t = rut.trim()
    if (!t) return null
    return getRutFieldError(rut, false)
  }, [])

  const handleRutChange = useCallback(
    (rowId: string, value: string) => {
      if (remaining <= 0 && !quotaLoading) return
      setRows(prev => {
        const idx = prev.findIndex(r => r.id === rowId)
        if (idx === -1) return prev

        const updated = prev.map((r, i) =>
          i === idx ? { ...r, rut: value } : r
        )
        const row = updated[idx]
        const err = getRutFieldError(row.rut, true)
        const isLast = idx === updated.length - 1
        const canGrow =
          !err &&
          row.rut.trim().length > 0 &&
          isLast &&
          updated.length < maxRowsAllowed

        if (canGrow) {
          return [
            ...updated,
            { id: crypto.randomUUID(), rut: '', observations: '' }
          ]
        }
        return updated
      })
    },
    [maxRowsAllowed, remaining, quotaLoading]
  )

  const handleRutBlur = useCallback((rowId: string) => {
    setRows(prev =>
      prev.map(r =>
        r.id === rowId ? { ...r, rut: formatRutOnBlur(r.rut) } : r
      )
    )
  }, [])

  const duplicateRutIds = useMemo(() => {
    const seen = new Map<string, string>()
    const dup = new Set<string>()
    for (const row of rows) {
      const k = normalizeRutKey(row.rut)
      if (!k || getRutFieldError(row.rut, true)) continue
      if (seen.has(k)) {
        dup.add(row.id)
        dup.add(seen.get(k)!)
      } else {
        seen.set(k, row.id)
      }
    }
    return dup
  }, [rows])

  const validRowsToSubmit = useMemo(() => {
    return rows.filter(r => {
      if (!r.rut.trim()) return false
      if (getRutFieldError(r.rut, true)) return false
      if (duplicateRutIds.has(r.id)) return false
      return true
    })
  }, [rows, duplicateRutIds])

  const handleSubmitAll = async () => {
    setSubmitSummary(null)
    let fresh: MailRegisterQuota
    try {
      fresh = await queryClient.fetchQuery({
        queryKey: ['mail-register-quota'],
        queryFn: fetchMailRegisterQuota
      })
    } catch {
      return
    }
    const cap = Math.max(0, fresh.remaining)
    const toRun = validRowsToSubmit.slice(0, cap)
    if (toRun.length === 0) {
      return
    }

    const skipped = validRowsToSubmit.length - toRun.length
    const errors: string[] = []
    if (skipped > 0) {
      errors.push(
        `Solo se enviaron ${toRun.length} por el límite diario (${fresh.limit}/día); quedaron ${skipped} sin enviar.`
      )
    }
    let ok = 0
    setBatchTotal(toRun.length)
    setBatchProcessed(0)
    setBatchOk(0)
    setBatchProgressPct(0)
    setSubmittingBatch(true)
    try {
      for (let i = 0; i < toRun.length; i++) {
        const row = toRun[i]
        const res = await fetch('/api/mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toRut: normalizeRutForApi(row.rut),
            observations: row.observations.trim() || undefined,
            mode: 'onlyReceptor'
          })
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        const processed = i + 1
        if (res.ok) {
          ok += 1
          setBatchOk(ok)
          setBatchProgressPct(Math.round((ok / toRun.length) * 100))
        } else {
          const label = row.rut.trim()
          errors.push(`${label}: ${data.error || 'Error al registrar'}`)
        }
        setBatchProcessed(processed)
      }
    } finally {
      setSubmittingBatch(false)
      setBatchTotal(0)
      setBatchProcessed(0)
      setBatchOk(0)
      setBatchProgressPct(0)
      await queryClient.invalidateQueries({ queryKey: ['mails'] })
      await queryClient.invalidateQueries({ queryKey: ['mails', 'me'] })
      await queryClient.invalidateQueries({ queryKey: ['mail-register-quota'] })
    }

    if (errors.length === 0 && ok > 0) {
      router.push('/dashboard/mail')
      return
    }
    setSubmitSummary({ ok, errors })
  }

  const quotaBlocked = !quotaLoading && remaining <= 0
  const registerCount = Math.min(validRowsToSubmit.length, remaining)

  return (
    <Stack spacing={2.5}>
      {quotaError ? (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
          No se pudo cargar el cupo. Recarga la página.
        </Alert>
      ) : null}

      {!quotaLoading && !quotaError ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          Cupo hoy: {usedToday}/{limit} ·{' '}
          {remaining > 0 ? (
            <>
              {remaining} restante{remaining === 1 ? '' : 's'}
            </>
          ) : (
            <>sin cupo</>
          )}
        </Alert>
      ) : null}

      {quotaBlocked ? (
        <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
          Sin cupo: borra un envío pendiente o vuelve mañana (Chile).
        </Alert>
      ) : null}

      {submittingBatch ? (
        <Box
          ref={batchProgressAnchorRef}
          sx={{
            width: '100%',
            scrollMarginTop: { xs: 16, sm: 24 }
          }}
        >
          <LinearProgress
            variant="determinate"
            value={batchProgressPct}
            sx={{ borderRadius: 1, height: 8 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            Enviando… {batchOk} de {batchTotal} correctos ({batchProgressPct}
            %). Paso {batchProcessed} de {batchTotal}.
          </Typography>
        </Box>
      ) : null}

      {submitSummary ? (
        <Alert
          severity={submitSummary.errors.length ? 'warning' : 'success'}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          {submitSummary.errors.length === 0 ? (
            <>Se registraron {submitSummary.ok} correo(s).</>
          ) : (
            <Box component="span">
              Registrados: {submitSummary.ok}. Fallos:{' '}
              {submitSummary.errors.length}.
              <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                {submitSummary.errors.map((e, i) => (
                  <Typography key={i} component="li" variant="body2">
                    {e}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {rows.map((row, index) => {
          const dup = duplicateRutIds.has(row.id)
          const rutErr = liveRutError(row.rut)

          return (
            <Paper
              key={row.id}
              elevation={0}
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 2.25 },
                borderRadius: 2,
                borderColor: t =>
                  dup
                    ? alpha(t.palette.warning.main, 0.45)
                    : alpha(t.palette.text.primary, 0.1),
                bgcolor: t => alpha(t.palette.background.paper, 0.9),
                transition: 'border-color 0.2s ease'
              }}
            >
              <Stack spacing={1.75}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      bgcolor: t => alpha(t.palette.primary.main, 0.12),
                      color: 'primary.main'
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Envío {index + 1}
                  </Typography>
                </Stack>

                <TextField
                  label="RUT receptor"
                  placeholder="12.345.678-5"
                  value={row.rut}
                  onChange={e => handleRutChange(row.id, e.target.value)}
                  onBlur={() => handleRutBlur(row.id)}
                  error={!!rutErr || dup}
                  helperText={
                    dup ? 'RUT duplicado en esta lista' : (rutErr ?? undefined)
                  }
                  size="small"
                  fullWidth
                  autoComplete="off"
                  disabled={quotaBlocked || quotaLoading || submittingBatch}
                  inputProps={{ maxLength: 20, inputMode: 'text' }}
                />

                <TextField
                  label="Comentarios (opcional)"
                  placeholder="Ej. descripción del envío…"
                  value={row.observations}
                  onChange={e =>
                    setRows(prev =>
                      prev.map(r =>
                        r.id === row.id
                          ? {
                              ...r,
                              observations: e.target.value.slice(0, OBS_MAX)
                            }
                          : r
                      )
                    )
                  }
                  multiline
                  minRows={2}
                  size="small"
                  fullWidth
                  disabled={quotaBlocked || quotaLoading || submittingBatch}
                  helperText={`${row.observations.length}/${OBS_MAX}`}
                  inputProps={{ maxLength: OBS_MAX }}
                />
              </Stack>
            </Paper>
          )
        })}
      </Stack>

      {!quotaBlocked &&
      rows.length >= maxRowsAllowed &&
      maxRowsAllowed < MAX_ROWS ? (
        <Alert severity="warning" variant="outlined">
          Máximo de filas según cupo hoy ({maxRowsAllowed}).
        </Alert>
      ) : null}

      {!quotaBlocked && rows.length >= MAX_ROWS ? (
        <Alert severity="warning" variant="outlined">
          Máximo {MAX_ROWS} filas por sesión.
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="flex-end"
        sx={{ pt: 1 }}
      >
        <Button
          variant="outlined"
          type="button"
          onClick={() => router.push('/dashboard/mail')}
          disabled={submittingBatch}
        >
          Volver a mis correos
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitAll}
          disabled={
            submittingBatch ||
            quotaLoading ||
            quotaError ||
            quotaBlocked ||
            validRowsToSubmit.length === 0 ||
            duplicateRutIds.size > 0 ||
            registerCount === 0
          }
        >
          {submittingBatch
            ? 'Registrando…'
            : `Registrar todos (${registerCount})`}
        </Button>
      </Stack>
    </Stack>
  )
}
