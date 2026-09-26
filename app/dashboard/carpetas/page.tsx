'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AddIcon from '@mui/icons-material/Add'
import ContentCopy from '@mui/icons-material/ContentCopy'
import ContentPasteGo from '@mui/icons-material/ContentPasteGo'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNew from '@mui/icons-material/OpenInNew'
import RemoveIcon from '@mui/icons-material/Remove'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  useCardBindersList,
  useCreateCardBinder,
  useDeleteCardBinder
} from '@/hooks/useCardBinders'
import {
  CARD_BINDER_NAME_MAX,
  CARD_BINDER_SLUG_MAX
} from '@/lib/card-binder-constants'
import {
  isValidCardBinderSlug,
  normalizeCardBinderSlug,
  slugFromCardBinderName
} from '@/lib/card-binder-slug'
import { CARD_SINGLE_CONDITION_LABELS } from '@/lib/card-single-condition'
import { CARD_SINGLE_LANGUAGE_LABELS } from '@/lib/card-single-language'
import type { CardBinderDTO, CardSingleDTO } from '@/lib/card-single-dto'
import {
  isValidSellerSlug,
  normalizeSellerSlug,
  SELLER_SLUG_MAX
} from '@/lib/seller-slug'

type SellerPageInfo = {
  eligible: boolean
  sellerSlug: string
  publicPath: string
}

type InterestMatch = {
  single: CardSingleDTO
  binderName: string
  parsed: {
    name: string
    set: string
    number: string
    quantity?: number
    raw: string
  }
  score: number
}

type PasteCardPlan = {
  mode: 'reduce' | 'unpublish'
  reduceBy: number
}

function defaultPastePlan(m: InterestMatch): PasteCardPlan {
  const stock = Math.max(1, m.single.quantity)
  const wanted = Math.max(1, Math.round(Number(m.parsed.quantity) || 1))
  if (stock <= 1) {
    return { mode: 'unpublish', reduceBy: 1 }
  }
  return {
    mode: 'reduce',
    reduceBy: Math.min(wanted, stock - 1) // deja al menos 1 publicada
  }
}

function formatClp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(n)
}

export default function CarpetasPage() {
  const qc = useQueryClient()
  const { data: binders, isPending, error } = useCardBindersList()
  const createBinder = useCreateCardBinder()
  const deleteBinder = useDeleteCardBinder()
  const sellerPage = useQuery({
    queryKey: ['me', 'seller-page'],
    queryFn: async (): Promise<SellerPageInfo> => {
      const res = await fetch('/api/me/seller-page')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string'
            ? j.error
            : 'Error al cargar página pública'
        )
      }
      return j as SellerPageInfo
    }
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CardBinderDTO | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [sellerSlugOpen, setSellerSlugOpen] = useState(false)
  const [sellerSlugEdit, setSellerSlugEdit] = useState('')
  const [sellerSlugError, setSellerSlugError] = useState<string | null>(null)
  const [sellerSlugPending, setSellerSlugPending] = useState(false)

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pastePending, setPastePending] = useState(false)
  const [pasteMatches, setPasteMatches] = useState<InterestMatch[]>([])
  const [pasteUnmatched, setPasteUnmatched] = useState<
    { name: string; set: string; number: string; raw: string }[]
  >([])
  const [pasteSelected, setPasteSelected] = useState<Set<string>>(
    () => new Set()
  )
  const [pastePlans, setPastePlans] = useState<Record<string, PasteCardPlan>>(
    {}
  )
  const [unpublishPending, setUnpublishPending] = useState(false)

  const suggestedSlug = slugFromCardBinderName(name)
  const slugFieldValue = slugTouched ? slug : suggestedSlug

  useEffect(() => {
    if (sellerPage.data?.sellerSlug) {
      setSellerSlugEdit(sellerPage.data.sellerSlug)
    }
  }, [sellerPage.data?.sellerSlug])

  const saveSellerSlug = async () => {
    setSellerSlugError(null)
    const s = normalizeSellerSlug(sellerSlugEdit)
    if (!isValidSellerSlug(s)) {
      setSellerSlugError(
        'Slug inválido. Usa 3–48 caracteres: minúsculas, números y guiones.'
      )
      return
    }
    setSellerSlugPending(true)
    try {
      const res = await fetch('/api/me/seller-page', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerSlug: s })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSellerSlugError(
          typeof j.error === 'string' ? j.error : 'No se pudo guardar'
        )
        return
      }
      await qc.invalidateQueries({ queryKey: ['me', 'seller-page'] })
      setSellerSlugOpen(false)
    } finally {
      setSellerSlugPending(false)
    }
  }

  const openPasteDialog = () => {
    setPasteText('')
    setPasteError(null)
    setPasteMatches([])
    setPasteUnmatched([])
    setPasteSelected(new Set())
    setPastePlans({})
    setPasteOpen(true)
  }

  const resolvePasteList = async () => {
    setPasteError(null)
    setPastePending(true)
    try {
      const res = await fetch('/api/me/singles/resolve-interest-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPasteError(
          typeof j.error === 'string' ? j.error : 'No se pudo interpretar'
        )
        return
      }
      const matches = (j.matches as InterestMatch[]) ?? []
      setPasteMatches(matches)
      setPasteUnmatched((j.unmatched as InterestMatch['parsed'][]) ?? [])
      setPasteSelected(new Set(matches.map(m => m.single.id)))
      const plans: Record<string, PasteCardPlan> = {}
      for (const m of matches) {
        plans[m.single.id] = defaultPastePlan(m)
      }
      setPastePlans(plans)
      if (!matches.length && typeof j.error === 'string') {
        setPasteError(j.error)
      }
    } finally {
      setPastePending(false)
    }
  }

  const applySelectedFromPaste = async () => {
    const ids = [...pasteSelected]
    if (!ids.length) return
    setUnpublishPending(true)
    setPasteError(null)
    try {
      const remaining: InterestMatch[] = []
      const nextPlans = { ...pastePlans }
      const nextSelected = new Set(pasteSelected)

      for (const m of pasteMatches) {
        if (!pasteSelected.has(m.single.id)) {
          remaining.push(m)
          continue
        }
        const plan = pastePlans[m.single.id] ?? defaultPastePlan(m)
        const stock = Math.max(1, m.single.quantity)

        if (plan.mode === 'reduce' && stock > 1) {
          const take = Math.min(Math.max(1, plan.reduceBy), stock - 1)
          const newQty = stock - take
          const res = await fetch(
            `/api/me/singles/${encodeURIComponent(m.single.id)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity: newQty })
            }
          )
          const j = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(
              typeof j.error === 'string'
                ? j.error
                : 'No se pudo actualizar el stock'
            )
          }
          const updated = (j.single as CardSingleDTO | undefined) ?? {
            ...m.single,
            quantity: newQty
          }
          remaining.push({ ...m, single: updated })
          nextPlans[m.single.id] = defaultPastePlan({
            ...m,
            single: updated
          })
          nextSelected.delete(m.single.id)
        } else {
          const res = await fetch(
            `/api/me/singles/${encodeURIComponent(m.single.id)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ published: false })
            }
          )
          const j = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(
              typeof j.error === 'string' ? j.error : 'No se pudo despublicar'
            )
          }
          delete nextPlans[m.single.id]
          nextSelected.delete(m.single.id)
        }
      }

      setPasteMatches(remaining)
      setPastePlans(nextPlans)
      setPasteSelected(nextSelected)
      void qc.invalidateQueries({ queryKey: ['me', 'binders'] })
      void qc.invalidateQueries({ queryKey: ['me', 'seller-page'] })
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : 'Error al aplicar')
    } finally {
      setUnpublishPending(false)
    }
  }

  const handleCreate = async () => {
    setFormError(null)
    const n = name.trim()
    if (!n) {
      setFormError('Escribe un nombre')
      return
    }
    const fromName = slugFromCardBinderName(n)
    const s = normalizeCardBinderSlug(
      (slugTouched ? slug : fromName).trim() || fromName
    )
    if (!isValidCardBinderSlug(s)) {
      setFormError(
        'Slug inválido. Usa 3–48 caracteres: minúsculas, números y guiones (ej. full-art).'
      )
      return
    }
    setSlugTouched(true)
    setSlug(s)
    try {
      await createBinder.mutateAsync({
        name: n,
        slug: s,
        description: description.trim()
      })
      void qc.invalidateQueries({ queryKey: ['me', 'seller-page'] })
      setCreateOpen(false)
      setName('')
      setSlug('')
      setSlugTouched(false)
      setDescription('')
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error')
    }
  }

  const copyLink = async (path: string) => {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800}>
              Carpetas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tus carpetas de singles. Cada una tiene un link público con su
              slug (ej. /carpetas/full-art).
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<ContentPasteGo />}
              onClick={openPasteDialog}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Pegar lista
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormError(null)
                setName('')
                setSlug('')
                setSlugTouched(false)
                setDescription('')
                setCreateOpen(true)
              }}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Nueva carpeta
            </Button>
          </Stack>
        </Stack>

        {sellerPage.data?.eligible && sellerPage.data.publicPath ? (
          <Alert
            severity="success"
            action={
              <Stack direction="row" spacing={0.5}>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setSellerSlugEdit(sellerPage.data?.sellerSlug ?? '')
                    setSellerSlugError(null)
                    setSellerSlugOpen(true)
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Editar slug
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  component={Link}
                  href={sellerPage.data.publicPath}
                  target="_blank"
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Abrir
                </Button>
              </Stack>
            }
          >
            Tu página de vendedor:{' '}
            <Link href={sellerPage.data.publicPath} target="_blank">
              {sellerPage.data.publicPath}
            </Link>
          </Alert>
        ) : sellerPage.data && !sellerPage.data.eligible ? (
          <Alert severity="info">
            Tu página pública de vendedor aparece cuando tengas al menos una
            carpeta con una carta publicada.
          </Alert>
        ) : null}

        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Error al cargar'}
          </Alert>
        ) : !binders?.length ? (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.04)
            }}
          >
            <Typography color="text.secondary">
              Aún no tienes carpetas. Crea una y elige el slug de tu link
              público.
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined">
            <List disablePadding>
              {binders.map((b, i) => (
                <ListItem
                  key={b.id}
                  divider={i < binders.length - 1}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {b.publicPath ? (
                        <>
                          <Tooltip title="Copiar link público">
                            <IconButton
                              edge="end"
                              aria-label="Copiar link"
                              onClick={() => void copyLink(b.publicPath)}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Abrir link público">
                            <IconButton
                              edge="end"
                              component={Link}
                              href={b.publicPath}
                              target="_blank"
                              aria-label="Abrir público"
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : null}
                      <IconButton
                        edge="end"
                        aria-label="Eliminar"
                        onClick={() => setDeleteTarget(b)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  }
                  disablePadding
                >
                  <ListItemButton
                    component={Link}
                    href={`/dashboard/carpetas/${encodeURIComponent(b.id)}`}
                  >
                    <ListItemIcon>
                      <FolderOpenIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={b.name}
                      secondary={
                        b.slug
                          ? `/${`carpetas/${b.slug}`} · ${b.singleCount ?? 0} singles · ${b.publishedCount ?? 0} publicados`
                          : `${b.singleCount ?? 0} singles`
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Stack>

      <Dialog
        open={createOpen}
        onClose={() => !createBinder.isPending && setCreateOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Nueva carpeta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre"
              value={name}
              onChange={e =>
                setName(e.target.value.slice(0, CARD_BINDER_NAME_MAX))
              }
              autoFocus
              fullWidth
              size="small"
            />
            <TextField
              label="Slug del link público"
              value={slugFieldValue}
              onChange={e => {
                setSlugTouched(true)
                // Permitir escribir; normalizar sin comer el cursor de más
                const raw = e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, CARD_BINDER_SLUG_MAX)
                setSlug(raw)
              }}
              onBlur={() => {
                const next = normalizeCardBinderSlug(slugFieldValue)
                setSlugTouched(true)
                setSlug(next)
              }}
              fullWidth
              size="small"
              required
              placeholder="full-art"
              helperText={
                normalizeCardBinderSlug(slugFieldValue)
                  ? `Se guardará el link: /carpetas/${normalizeCardBinderSlug(slugFieldValue)}`
                  : 'Escribe el slug aquí (ej. full-art). Se genera solo si escribes el nombre.'
              }
              error={
                Boolean(slugFieldValue) &&
                !isValidCardBinderSlug(normalizeCardBinderSlug(slugFieldValue))
              }
            />
            <TextField
              label="Descripción (opcional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            {formError ? <Alert severity="error">{formError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={createBinder.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={createBinder.isPending}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pasteOpen}
        onClose={() =>
          !pastePending && !unpublishPending && setPasteOpen(false)
        }
        fullWidth
        maxWidth={pasteMatches.length > 0 ? 'md' : 'sm'}
      >
        <DialogTitle>
          {pasteMatches.length > 0
            ? 'Cartas a despublicar'
            : 'Pegar lista de interés'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {pasteMatches.length === 0 ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Pega el mensaje que te enviaron (con las cartas y el total).
                  Se buscarán en tus publicaciones para despublicarlas.
                </Typography>
                <TextField
                  label="Mensaje pegado"
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  fullWidth
                  multiline
                  minRows={4}
                  placeholder="Hola … Me interesan estas cartas: • …"
                />
                <Button
                  variant="contained"
                  onClick={() => void resolvePasteList()}
                  disabled={pastePending || !pasteText.trim()}
                  sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                >
                  {pastePending ? 'Buscando…' : 'Buscar en mis carpetas'}
                </Button>
              </>
            ) : (
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  useFlexGap
                  spacing={1}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={
                          pasteMatches.length > 0 &&
                          pasteSelected.size === pasteMatches.length
                        }
                        indeterminate={
                          pasteSelected.size > 0 &&
                          pasteSelected.size < pasteMatches.length
                        }
                        onChange={(_, checked) => {
                          setPasteSelected(
                            checked
                              ? new Set(pasteMatches.map(m => m.single.id))
                              : new Set()
                          )
                        }}
                      />
                    }
                    label={`${pasteSelected.size} de ${pasteMatches.length} seleccionadas`}
                  />
                  <Button
                    size="small"
                    onClick={() => {
                      setPasteMatches([])
                      setPasteUnmatched([])
                      setPasteSelected(new Set())
                      setPastePlans({})
                      setPasteError(null)
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Pegar otra lista
                  </Button>
                </Stack>

                <Stack spacing={1.5}>
                  {pasteMatches.map(m => {
                    const checked = pasteSelected.has(m.single.id)
                    const plan = pastePlans[m.single.id] ?? defaultPastePlan(m)
                    const stock = Math.max(1, m.single.quantity)
                    const canReduce = stock > 1
                    return (
                      <Paper
                        key={m.single.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          display: 'flex',
                          gap: 2,
                          alignItems: 'flex-start',
                          bgcolor: checked
                            ? t => alpha(t.palette.warning.main, 0.06)
                            : undefined,
                          borderColor: checked ? 'warning.main' : undefined
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          onChange={() => {
                            setPasteSelected(prev => {
                              const next = new Set(prev)
                              if (next.has(m.single.id))
                                next.delete(m.single.id)
                              else next.add(m.single.id)
                              return next
                            })
                          }}
                          sx={{ mt: 0.5, p: 0.5 }}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.single.imageUrl}
                          alt=""
                          width={72}
                          height={100}
                          style={{
                            objectFit: 'contain',
                            borderRadius: 6,
                            flexShrink: 0
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={800} noWrap>
                            {m.single.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {m.binderName || 'Carpeta'} · {m.single.set}{' '}
                            {m.single.number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {CARD_SINGLE_LANGUAGE_LABELS[m.single.language]} ·{' '}
                            {CARD_SINGLE_CONDITION_LABELS[m.single.condition]}
                            {` · stock x${stock}`}
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{ mt: 0.5, letterSpacing: '-0.02em' }}
                          >
                            {formatClp(m.single.priceClp)}
                          </Typography>

                          {canReduce ? (
                            <Stack spacing={1} sx={{ mt: 1.25 }}>
                              <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={plan.mode}
                                onChange={(
                                  _,
                                  v: 'reduce' | 'unpublish' | null
                                ) => {
                                  if (!v) return
                                  setPastePlans(prev => ({
                                    ...prev,
                                    [m.single.id]: {
                                      ...plan,
                                      mode: v,
                                      reduceBy:
                                        v === 'reduce'
                                          ? Math.min(
                                              plan.reduceBy || 1,
                                              stock - 1
                                            )
                                          : plan.reduceBy
                                    }
                                  }))
                                }}
                              >
                                <ToggleButton
                                  value="reduce"
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 700
                                  }}
                                >
                                  Bajar stock
                                </ToggleButton>
                                <ToggleButton
                                  value="unpublish"
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 700
                                  }}
                                >
                                  Despublicar
                                </ToggleButton>
                              </ToggleButtonGroup>
                              {plan.mode === 'reduce' ? (
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <Typography variant="body2">
                                    Quitar
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    disabled={plan.reduceBy <= 1}
                                    onClick={() =>
                                      setPastePlans(prev => ({
                                        ...prev,
                                        [m.single.id]: {
                                          ...plan,
                                          reduceBy: Math.max(
                                            1,
                                            plan.reduceBy - 1
                                          )
                                        }
                                      }))
                                    }
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                  <Typography fontWeight={800}>
                                    {plan.reduceBy}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    disabled={plan.reduceBy >= stock - 1}
                                    onClick={() =>
                                      setPastePlans(prev => ({
                                        ...prev,
                                        [m.single.id]: {
                                          ...plan,
                                          reduceBy: Math.min(
                                            stock - 1,
                                            plan.reduceBy + 1
                                          )
                                        }
                                      }))
                                    }
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    → quedará x{stock - plan.reduceBy}
                                  </Typography>
                                </Stack>
                              ) : (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Se sacará por completo de la venta pública.
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 1 }}
                            >
                              Solo hay 1 unidad: al aplicar se despublica.
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    )
                  })}
                </Stack>
              </Stack>
            )}

            {pasteUnmatched.length > 0 ? (
              <Alert severity="warning">
                No se encontraron {pasteUnmatched.length} carta
                {pasteUnmatched.length === 1 ? '' : 's'} (quizá ya no están
                publicadas):{' '}
                {pasteUnmatched
                  .map(u => `${u.name} (${u.set} ${u.number})`)
                  .join(', ')}
              </Alert>
            ) : null}

            {pasteError ? <Alert severity="error">{pasteError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPasteOpen(false)}
            disabled={pastePending || unpublishPending}
          >
            Cerrar
          </Button>
          {pasteMatches.length > 0 ? (
            <Button
              color="warning"
              variant="contained"
              disabled={
                unpublishPending || pastePending || pasteSelected.size === 0
              }
              onClick={() => void applySelectedFromPaste()}
            >
              Aplicar seleccionadas
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={sellerSlugOpen}
        onClose={() => !sellerSlugPending && setSellerSlugOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Slug de tu página de vendedor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Slug"
              size="small"
              fullWidth
              value={sellerSlugEdit}
              onChange={e => {
                const raw = e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, SELLER_SLUG_MAX)
                setSellerSlugEdit(raw)
              }}
              onBlur={() =>
                setSellerSlugEdit(normalizeSellerSlug(sellerSlugEdit))
              }
              helperText={
                normalizeSellerSlug(sellerSlugEdit)
                  ? `Link: /vendedores/${normalizeSellerSlug(sellerSlugEdit)}`
                  : 'Minúsculas, números y guiones.'
              }
            />
            {sellerSlugError ? (
              <Alert severity="error">{sellerSlugError}</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSellerSlugOpen(false)}
            disabled={sellerSlugPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveSellerSlug()}
            disabled={sellerSlugPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBinder.isPending && setDeleteTarget(null)}
      >
        <DialogTitle>Eliminar carpeta</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar «{deleteTarget?.name}» y todos sus singles?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteBinder.isPending}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteBinder.isPending}
            onClick={async () => {
              if (!deleteTarget) return
              await deleteBinder.mutateAsync(deleteTarget.id)
              setDeleteTarget(null)
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
