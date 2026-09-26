'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ContentCopy from '@mui/icons-material/ContentCopy'
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
import Snackbar from '@mui/material/Snackbar'
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
import {
  CARD_SINGLE_LANGUAGES,
  CARD_SINGLE_LANGUAGE_LABELS,
  type CardSingleLanguage
} from '@/lib/card-single-language'
import type { CardSingleDTO } from '@/lib/card-single-dto'
import {
  buildInterestListMessage,
  buildWhatsAppHref
} from '@/lib/card-single-whatsapp'
import { limitlessCardImageUrl } from '@/lib/decklist'

type PublicSingle = CardSingleDTO & {
  binderName: string
  sellerName: string
  sellerPhone: string
  whatsappHref: string | null
  interestedByMe: boolean
}

type ListResponse = {
  binder: { id: string; name: string; slug: string; description: string }
  seller: { name: string; phone: string; whatsappHref: string | null }
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

function SingleCard({
  s,
  myUserId,
  authStatus,
  interestBusy,
  selected,
  onToggleSelect,
  onInterest
}: {
  s: PublicSingle
  myUserId: string
  authStatus: string
  interestBusy: string | null
  selected: boolean
  onToggleSelect: (s: PublicSingle) => void
  onInterest: (s: PublicSingle) => void
}) {
  const isMine = Boolean(myUserId && s.userId === myUserId)
  const img = limitlessCardImageUrl({
    set: s.set,
    number: s.number,
    size: 'LG',
    cardName: s.name
  })

  return (
    <Paper
      elevation={0}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onToggleSelect(s)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggleSelect(s)
        }
      }}
      sx={t => ({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 2.5,
        cursor: 'pointer',
        outline: 'none',
        border: selected
          ? `2px solid ${t.palette.primary.main}`
          : `1px solid ${alpha(t.palette.divider, 0.9)}`,
        bgcolor: selected
          ? alpha(t.palette.primary.main, 0.06)
          : 'background.paper',
        transition:
          'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 12px 28px -18px ${alpha(t.palette.common.black, 0.45)}`
        },
        '&:focus-visible': {
          boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.35)}`
        }
      })}
    >
      <Box
        sx={t => ({
          position: 'relative',
          bgcolor: alpha(t.palette.action.hover, 0.45),
          backgroundImage: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 55%)`,
          px: 2,
          pt: 2,
          pb: 1.5,
          display: 'flex',
          justifyContent: 'center',
          minHeight: { xs: 200, sm: 220 }
        })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={s.name}
          width={150}
          height={210}
          style={{
            objectFit: 'contain',
            maxHeight: 210,
            width: 'auto',
            filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.18))'
          }}
        />
        <Chip
          size="small"
          label={CARD_SINGLE_CONDITION_LABELS[s.condition]}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontWeight: 700,
            bgcolor: 'background.paper'
          }}
        />
        <Chip
          size="small"
          label={CARD_SINGLE_LANGUAGE_LABELS[s.language]}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontWeight: 700,
            bgcolor: 'background.paper'
          }}
        />
        {selected ? (
          <Chip
            size="small"
            color="primary"
            label="En la lista"
            sx={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              fontWeight: 800
            }}
          />
        ) : null}
      </Box>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flex: 1
        }}
      >
        <Box>
          <Typography
            fontWeight={800}
            sx={{
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {s.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {s.set} · {s.number}
          </Typography>
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Stack
            direction="row"
            alignItems="baseline"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ letterSpacing: '-0.03em' }}
            >
              {formatClp(s.priceClp)}
            </Typography>
            {s.compareAtPriceClp != null && s.compareAtPriceClp > s.priceClp ? (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  textDecoration: 'line-through',
                  fontWeight: 500,
                  letterSpacing: '-0.02em'
                }}
              >
                {formatClp(s.compareAtPriceClp)}
              </Typography>
            ) : null}
          </Stack>
          <Chip
            size="small"
            color={s.quantity > 1 ? 'primary' : 'default'}
            variant={s.quantity > 1 ? 'filled' : 'outlined'}
            label={
              s.quantity === 1 ? '1 disponible' : `${s.quantity} disponibles`
            }
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {s.interestCount} interesado{s.interestCount === 1 ? '' : 's'}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 'auto', pt: 0.5 }}
          useFlexGap
          flexWrap="wrap"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
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
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                flex: 1,
                minWidth: 120
              }}
            >
              WhatsApp
            </Button>
          ) : (
            <Button
              size="small"
              disabled
              sx={{ textTransform: 'none', flex: 1 }}
            >
              Sin teléfono
            </Button>
          )}
          {isMine ? (
            <Chip
              size="small"
              label="Tu publicación"
              variant="outlined"
              sx={{ alignSelf: 'center' }}
            />
          ) : (
            <Button
              size="small"
              variant={s.interestedByMe ? 'contained' : 'outlined'}
              color={s.interestedByMe ? 'secondary' : 'primary'}
              startIcon={s.interestedByMe ? <Favorite /> : <FavoriteBorder />}
              disabled={authStatus !== 'authenticated' || interestBusy === s.id}
              onClick={() => onInterest(s)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Me interesa
            </Button>
          )}
        </Stack>
      </Box>
    </Paper>
  )
}

export default function PublicCarpetaSinglesClient({ slug }: { slug: string }) {
  const { data: session, status } = useSession()
  const myUserId = session?.user?.id ? String(session.user.id) : ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [condition, setCondition] = useState<CardSingleCondition | ''>('')
  const [language, setLanguage] = useState<CardSingleLanguage | ''>('')
  const [interestBusy, setInterestBusy] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [selectedById, setSelectedById] = useState<
    Record<string, PublicSingle>
  >({})
  const [copyToast, setCopyToast] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    if (!slug.trim()) {
      setLoading(false)
      setError('Carpeta no válida')
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQ) params.set('q', debouncedQ)
      if (condition) params.set('condition', condition)
      if (language) params.set('language', language)
      const res = await fetch(
        `/api/public/carpetas/${encodeURIComponent(slug)}?${params}`
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
  }, [slug, debouncedQ, condition, language])

  useEffect(() => {
    void load()
  }, [load])

  const toggleInterest = async (s: PublicSingle) => {
    if (status !== 'authenticated') return
    setInterestBusy(s.id)
    setActionMsg(null)
    try {
      const res = await fetch(
        `/api/me/singles/${encodeURIComponent(s.id)}/interest`,
        { method: s.interestedByMe ? 'DELETE' : 'POST' }
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionMsg(
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

  const toggleSelect = (s: PublicSingle) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(s.id)) next.delete(s.id)
      else next.add(s.id)
      return next
    })
    setSelectedById(prev => {
      if (prev[s.id]) {
        const { [s.id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [s.id]: s }
    })
  }

  const selectedList = useMemo(() => {
    return [...selectedIds]
      .map(id => selectedById[id])
      .filter((s): s is PublicSingle => Boolean(s))
  }, [selectedIds, selectedById])

  const interestMessage = useMemo(() => {
    if (!selectedList.length) return ''
    return buildInterestListMessage(
      selectedList.map(s => ({
        name: s.name,
        set: s.set,
        number: s.number,
        languageLabel: CARD_SINGLE_LANGUAGE_LABELS[s.language],
        conditionLabel: CARD_SINGLE_CONDITION_LABELS[s.condition],
        quantity: s.quantity,
        priceClp: s.priceClp
      })),
      {
        binderName: data?.binder.name,
        sellerName: data?.seller.name
      }
    )
  }, [selectedList, data?.binder.name, data?.seller.name])

  const selectedTotal = useMemo(
    () =>
      selectedList.reduce(
        (sum, s) => sum + s.priceClp * Math.max(1, s.quantity),
        0
      ),
    [selectedList]
  )

  const listWhatsappHref = useMemo(() => {
    if (!interestMessage || !data?.seller.phone) return null
    return buildWhatsAppHref(data.seller.phone, interestMessage)
  }, [interestMessage, data?.seller.phone])

  const copyInterestList = async () => {
    if (!interestMessage) return
    try {
      await navigator.clipboard.writeText(interestMessage)
      setCopyToast('Lista copiada. Ya puedes pegarla en WhatsApp.')
    } catch {
      setCopyToast('No se pudo copiar. Selecciona el texto manualmente.')
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectedById({})
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        pb: selectedList.length ? { xs: 14, sm: 12 } : 0
      }}
    >
      <Header />
      <Container
        maxWidth={false}
        sx={{
          flex: 1,
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3, md: 4, lg: 5 },
          maxWidth: 1400,
          width: '100%',
          mx: 'auto'
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ md: 'flex-end' }}
            justifyContent="space-between"
          >
            <Stack spacing={0.5}>
              <BrandLogo size="sm" />
              <Typography variant="overline" color="text.secondary">
                Carpeta de singles
              </Typography>
              <Typography
                variant="h3"
                component="h1"
                fontWeight={900}
                sx={{
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '1.75rem', md: '2.25rem' }
                }}
              >
                {data?.binder.name ?? slug}
              </Typography>
              {data?.seller.name ? (
                <Typography variant="body2" color="text.secondary">
                  Por {data.seller.name}
                  {data.binder.description
                    ? ` · ${data.binder.description}`
                    : ''}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Cartas a la venta. Contacta por WhatsApp; no hay pago en la
                  plataforma.
                </Typography>
              )}
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: 420 } }}
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
              <FormControl size="small" sx={{ minWidth: { sm: 160 } }}>
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
              <FormControl size="small" sx={{ minWidth: { sm: 140 } }}>
                <InputLabel id="lang-filter">Idioma</InputLabel>
                <Select
                  labelId="lang-filter"
                  label="Idioma"
                  value={language}
                  onChange={e =>
                    setLanguage(e.target.value as CardSingleLanguage | '')
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {CARD_SINGLE_LANGUAGES.map(l => (
                    <MenuItem key={l} value={l}>
                      {CARD_SINGLE_LANGUAGE_LABELS[l]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {status !== 'authenticated' ? (
            <Alert severity="info">
              <Link href="/" style={{ fontWeight: 700 }}>
                Inicia sesión
              </Link>{' '}
              para marcar «Me interesa» en una carta.
            </Alert>
          ) : null}

          {actionMsg ? (
            <Alert severity="warning" onClose={() => setActionMsg(null)}>
              {actionMsg}
            </Alert>
          ) : null}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : error && !data ? (
            <Alert severity="error">{error}</Alert>
          ) : !data?.singles.length ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: t => alpha(t.palette.primary.main, 0.04)
              }}
            >
              <Typography color="text.secondary">
                No hay singles publicados en esta carpeta.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {error ? (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              ) : null}
              <Typography variant="body2" color="text.secondary">
                {data.total} resultado{data.total === 1 ? '' : 's'} · Toca las
                cartas para armar una lista y copiarla o enviarla por WhatsApp.
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 2, sm: 2.5, md: 3 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))'
                  }
                }}
              >
                {data.singles.map(s => (
                  <SingleCard
                    key={s.id}
                    s={s}
                    myUserId={myUserId}
                    authStatus={status}
                    interestBusy={interestBusy}
                    selected={selectedIds.has(s.id)}
                    onToggleSelect={toggleSelect}
                    onInterest={single => void toggleInterest(single)}
                  />
                ))}
              </Box>
            </Stack>
          )}
        </Stack>
      </Container>
      <Box sx={{ py: 2 }}>
        <AppVersion />
      </Box>

      {selectedList.length > 0 ? (
        <Paper
          elevation={8}
          sx={t => ({
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: t.zIndex.snackbar,
            borderRadius: 0,
            borderTop: `1px solid ${t.palette.divider}`,
            px: { xs: 2, sm: 3 },
            py: 1.5,
            bgcolor: 'background.paper'
          })}
        >
          <Container maxWidth="lg" disableGutters>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography fontWeight={800}>
                  {selectedList.length} carta
                  {selectedList.length === 1 ? '' : 's'} · Total{' '}
                  {formatClp(selectedTotal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Incluye idioma, estado, cantidad y precio.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  onClick={clearSelection}
                  sx={{ textTransform: 'none' }}
                >
                  Limpiar
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopy />}
                  onClick={() => void copyInterestList()}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Copiar lista
                </Button>
                {listWhatsappHref ? (
                  <Button
                    component="a"
                    href={listWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Enviar por WhatsApp
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Container>
        </Paper>
      ) : null}

      <Snackbar
        open={Boolean(copyToast)}
        autoHideDuration={3200}
        onClose={() => setCopyToast(null)}
        message={copyToast ?? ''}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Box>
  )
}
