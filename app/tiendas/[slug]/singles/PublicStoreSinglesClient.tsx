'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Favorite from '@mui/icons-material/Favorite'
import FavoriteBorder from '@mui/icons-material/FavoriteBorder'
import SearchIcon from '@mui/icons-material/Search'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import AppVersion from '@/components/AppVersion'
import BrandLogo from '@/components/brand/BrandLogo'
import Header from '@/components/Header'
import {
  CARD_SINGLE_CONDITIONS,
  CARD_SINGLE_CONDITION_LABELS,
  type CardSingleCondition
} from '@/lib/card-single-condition'
import type { CardSingleDTO } from '@/lib/card-single-dto'

type PublicSingle = CardSingleDTO & {
  binderName: string
  sellerName: string
  sellerPhone: string
  whatsappHref: string | null
  interestedByMe: boolean
}

type ListResponse = {
  store: { id: string; name: string; slug: string }
  total: number
  singles: PublicSingle[]
  error?: string
}

function formatClp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(n)
}

export default function PublicStoreSinglesClient({ slug }: { slug: string }) {
  const { status } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [condition, setCondition] = useState<CardSingleCondition | ''>('')
  const [interestBusy, setInterestBusy] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    if (!slug.trim()) {
      setLoading(false)
      setError('Tienda no válida')
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQ) params.set('q', debouncedQ)
      if (condition) params.set('condition', condition)
      const res = await fetch(
        `/api/public/stores/${encodeURIComponent(slug)}/singles?${params}`
      )
      const json = (await res.json().catch(() => ({}))) as ListResponse
      if (!res.ok) {
        setError(
          typeof json.error === 'string'
            ? json.error
            : 'No se pudieron cargar los singles'
        )
        setData(null)
        return
      }
      setData(json)
    } catch {
      setError('No se pudieron cargar los singles')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slug, debouncedQ, condition])

  useEffect(() => {
    void load()
  }, [load])

  const toggleInterest = async (s: PublicSingle) => {
    if (status !== 'authenticated') return
    setInterestBusy(s.id)
    try {
      const res = await fetch(
        `/api/me/singles/${encodeURIComponent(s.id)}/interest`,
        { method: s.interestedByMe ? 'DELETE' : 'POST' }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          typeof j.error === 'string' ? j.error : 'No se pudo actualizar'
        )
        return
      }
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          singles: prev.singles.map(row =>
            row.id === s.id
              ? {
                  ...row,
                  interestedByMe: Boolean(j.interestedByMe),
                  interestCount: Number(j.interestCount) || 0
                }
              : row
          )
        }
      })
    } finally {
      setInterestBusy(null)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Header />
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <BrandLogo size="sm" />
            <Typography variant="overline" color="text.secondary">
              Singles publicados
            </Typography>
            <Typography variant="h4" component="h1" fontWeight={800}>
              {data?.store.name ?? slug}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cartas a la venta por jugadores. Contacta por WhatsApp; no hay
              pago en la plataforma.
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar por nombre"
              value={q}
              onChange={e => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="cond-filter">Estado</InputLabel>
              <Select
                labelId="cond-filter"
                label="Estado"
                value={condition}
                onChange={e =>
                  setCondition(e.target.value as CardSingleCondition | '')
                }
              >
                <MenuItem value="">Todos</MenuItem>
                {CARD_SINGLE_CONDITIONS.map(c => (
                  <MenuItem key={c} value={c}>
                    {CARD_SINGLE_CONDITION_LABELS[c]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {status !== 'authenticated' ? (
            <Alert severity="info">
              <Link href="/" style={{ fontWeight: 700 }}>
                Inicia sesión
              </Link>{' '}
              para marcar «Me interesa» en una carta.
            </Alert>
          ) : null}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : !data?.singles.length ? (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: t => alpha(t.palette.primary.main, 0.04)
              }}
            >
              <Typography color="text.secondary">
                No hay singles publicados todavía.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary">
                {data.total} resultado{data.total === 1 ? '' : 's'}
              </Typography>
              {data.singles.map(s => (
                <Paper
                  key={s.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start'
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageUrl}
                    alt=""
                    width={64}
                    height={90}
                    style={{ objectFit: 'contain', borderRadius: 4 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700}>{s.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.set} · {s.number}
                      {s.quantity > 1 ? ` · x${s.quantity}` : ''}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mt: 0.5 }}
                    >
                      <Chip
                        size="small"
                        label={CARD_SINGLE_CONDITION_LABELS[s.condition]}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={s.sellerName}
                      />
                    </Stack>
                    <Typography variant="h6" fontWeight={800} sx={{ mt: 0.75 }}>
                      {formatClp(s.priceClp)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.interestCount} interesado
                      {s.interestCount === 1 ? '' : 's'}
                      {s.binderName ? ` · ${s.binderName}` : ''}
                    </Typography>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{ mt: 1.25 }}
                    >
                      {s.whatsappHref ? (
                        <Button
                          component="a"
                          href={s.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          variant="contained"
                          startIcon={<WhatsAppIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          WhatsApp
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          disabled
                          sx={{ textTransform: 'none' }}
                        >
                          Sin teléfono
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant={s.interestedByMe ? 'contained' : 'outlined'}
                        color={s.interestedByMe ? 'secondary' : 'primary'}
                        startIcon={
                          s.interestedByMe ? <Favorite /> : <FavoriteBorder />
                        }
                        disabled={
                          status !== 'authenticated' || interestBusy === s.id
                        }
                        onClick={() => void toggleInterest(s)}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Me interesa
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
      <Box sx={{ py: 2 }}>
        <AppVersion />
      </Box>
    </Box>
  )
}
