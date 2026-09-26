'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import ArrowBack from '@mui/icons-material/ArrowBack'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FavoriteBorder from '@mui/icons-material/FavoriteBorder'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import LimitlessCardSearchField, {
  type LimitlessCardPick
} from '@/components/carpetas/LimitlessCardSearchField'
import {
  useBinderSingles,
  useCreateBinderSingle,
  useDeleteCardSingle,
  usePatchCardBinder,
  usePatchCardSingle
} from '@/hooks/useCardBinders'
import {
  CARD_BINDER_DESCRIPTION_MAX,
  CARD_BINDER_NAME_MAX,
  CARD_BINDER_SLUG_MAX
} from '@/lib/card-binder-constants'
import {
  CARD_SINGLE_CONDITIONS,
  CARD_SINGLE_CONDITION_LABELS,
  type CardSingleCondition
} from '@/lib/card-single-condition'
import {
  CARD_SINGLE_LANGUAGES,
  CARD_SINGLE_LANGUAGE_LABELS,
  suggestLanguageFromRegion,
  type CardSingleLanguage
} from '@/lib/card-single-language'
import type { CardSingleDTO } from '@/lib/card-single-dto'
import { groupCardSingles } from '@/lib/card-single-group'
import {
  isValidCardBinderSlug,
  normalizeCardBinderSlug,
  slugFromCardBinderName
} from '@/lib/card-binder-slug'
import { formatLimitlessMarketPriceUsd } from '@/lib/limitless-dm-api'

function formatClp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(n)
}

export default function CarpetaDetailPage({
  params
}: {
  params: Promise<{ binderId: string }>
}) {
  const { binderId } = use(params)
  const { data, isPending, error } = useBinderSingles(binderId)
  const createSingle = useCreateBinderSingle(binderId)
  const patchSingle = usePatchCardSingle(binderId)
  const deleteSingle = useDeleteCardSingle(binderId)
  const patchBinder = usePatchCardBinder()
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [pick, setPick] = useState<LimitlessCardPick | null>(null)
  const [condition, setCondition] = useState<CardSingleCondition>('NM')
  const [language, setLanguage] = useState<CardSingleLanguage>('EN')
  const [priceClp, setPriceClp] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [detailVariants, setDetailVariants] = useState(false)
  const [addVariants, setAddVariants] = useState<
    {
      key: string
      language: CardSingleLanguage
      condition: CardSingleCondition
      quantity: string
      priceClp: string
    }[]
  >([])

  const [editSingleOpen, setEditSingleOpen] = useState(false)
  const [editingSingle, setEditingSingle] = useState<CardSingleDTO | null>(null)
  const [editCondition, setEditCondition] = useState<CardSingleCondition>('NM')
  const [editLanguage, setEditLanguage] = useState<CardSingleLanguage>('EN')
  const [editPriceClp, setEditPriceClp] = useState('')
  const [editQuantity, setEditQuantity] = useState('1')
  const [editNote, setEditNote] = useState('')
  const [editSingleError, setEditSingleError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkPending, setBulkPending] = useState(false)

  const [offerOpen, setOfferOpen] = useState(false)
  const [offerSingle, setOfferSingle] = useState<CardSingleDTO | null>(null)
  const [offerPriceClp, setOfferPriceClp] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)

  const [splitOpen, setSplitOpen] = useState(false)
  const [splitSource, setSplitSource] = useState<CardSingleDTO | null>(null)
  const [splitLanguage, setSplitLanguage] = useState<CardSingleLanguage>('ES')
  const [splitCondition, setSplitCondition] =
    useState<CardSingleCondition>('NM')
  const [splitPriceClp, setSplitPriceClp] = useState('')
  const [splitQuantity, setSplitQuantity] = useState('1')
  const [splitDeduct, setSplitDeduct] = useState(true)
  const [splitError, setSplitError] = useState<string | null>(null)
  const [splitPending, setSplitPending] = useState(false)

  const openAdd = (p: LimitlessCardPick) => {
    setPick(p)
    setCondition('NM')
    const lang = suggestLanguageFromRegion(p.hit.region)
    setLanguage(lang)
    setPriceClp('')
    setQuantity('1')
    setNote('')
    setDetailVariants(false)
    setAddVariants([
      {
        key: 'v0',
        language: lang,
        condition: 'NM',
        quantity: '1',
        priceClp: ''
      }
    ])
    setFormError(null)
    setAddOpen(true)
  }

  const openEditSingle = (s: CardSingleDTO) => {
    setEditingSingle(s)
    setEditCondition(s.condition)
    setEditLanguage(s.language)
    setEditPriceClp(String(s.priceClp))
    setEditQuantity(String(s.quantity))
    setEditNote(s.note ?? '')
    setEditSingleError(null)
    setEditSingleOpen(true)
  }

  const openOffer = (s: CardSingleDTO) => {
    setOfferSingle(s)
    setOfferPriceClp('')
    setOfferError(null)
    setOfferOpen(true)
  }

  const openSplitLanguage = (s: CardSingleDTO) => {
    const other = CARD_SINGLE_LANGUAGES.find(l => l !== s.language) ?? 'ES'
    setSplitSource(s)
    setSplitLanguage(other)
    setSplitCondition(s.condition)
    setSplitPriceClp(String(s.priceClp))
    const suggested =
      s.quantity > 1 ? Math.min(Math.floor(s.quantity / 2), s.quantity - 1) : 1
    setSplitQuantity(String(Math.max(1, suggested)))
    setSplitDeduct(s.quantity > 1)
    setSplitError(null)
    setSplitOpen(true)
  }

  const handleSplitLanguage = async () => {
    if (!splitSource) return
    setSplitError(null)
    const qty = Math.round(Number(splitQuantity))
    const price = Math.round(Number(splitPriceClp))
    if (!Number.isFinite(qty) || qty < 1) {
      setSplitError('Cantidad inválida')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setSplitError('Precio inválido')
      return
    }
    if (splitDeduct) {
      if (splitSource.quantity <= 1) {
        setSplitError(
          'Con 1 unidad no se puede restar stock. Desmarca “Restar del stock” o aumenta la cantidad primero.'
        )
        return
      }
      if (qty >= splitSource.quantity) {
        setSplitError(
          `Para restar del stock, la cantidad debe ser menor a ${splitSource.quantity}`
        )
        return
      }
    }
    setSplitPending(true)
    try {
      await createSingle.mutateAsync({
        limitlessId: splitSource.limitlessId,
        set: splitSource.set,
        number: splitSource.number,
        region: splitSource.region,
        name: splitSource.name,
        cardType: splitSource.cardType,
        condition: splitCondition,
        language: splitLanguage,
        priceClp: price,
        quantity: qty,
        note: splitSource.note,
        marketPriceUsd: splitSource.marketPriceUsd
      })
      if (splitDeduct) {
        await patchSingle.mutateAsync({
          id: splitSource.id,
          patch: { quantity: splitSource.quantity - qty }
        })
      }
      setSplitOpen(false)
      setSplitSource(null)
    } catch (e) {
      setSplitError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSplitPending(false)
    }
  }

  const handleAdd = async () => {
    if (!pick) return
    setFormError(null)
    const base = {
      limitlessId: pick.detail?.data_id ?? pick.hit.id,
      set: pick.hit.set,
      number: String(pick.hit.number),
      region: pick.hit.region || 'int',
      name: pick.detail?.name ?? pick.hit.name,
      cardType: pick.detail?.card_type ?? pick.hit.card_type ?? '',
      note,
      marketPriceUsd: pick.detail?.market_price ?? null
    }

    try {
      if (detailVariants) {
        const rows = addVariants.map(v => ({
          language: v.language,
          condition: v.condition,
          quantity: Math.round(Number(v.quantity)),
          priceClp: Math.round(Number(v.priceClp))
        }))
        if (!rows.length) {
          setFormError('Agrega al menos una variante')
          return
        }
        for (const r of rows) {
          if (!Number.isFinite(r.quantity) || r.quantity < 1) {
            setFormError('Cada variante necesita cantidad ≥ 1')
            return
          }
          if (!Number.isFinite(r.priceClp) || r.priceClp < 0) {
            setFormError('Cada variante necesita un precio válido')
            return
          }
        }
        for (const r of rows) {
          await createSingle.mutateAsync({
            ...base,
            condition: r.condition,
            language: r.language,
            priceClp: r.priceClp,
            quantity: r.quantity
          })
        }
      } else {
        const price = Math.round(Number(priceClp))
        const qty = Math.round(Number(quantity))
        if (!Number.isFinite(price) || price < 0) {
          setFormError('Precio inválido')
          return
        }
        if (!Number.isFinite(qty) || qty < 1) {
          setFormError('Cantidad inválida')
          return
        }
        await createSingle.mutateAsync({
          ...base,
          condition,
          language,
          priceClp: price,
          quantity: qty
        })
      }
      setAddOpen(false)
      setPick(null)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleEditSingleSave = async () => {
    if (!editingSingle) return
    setEditSingleError(null)
    const price = Math.round(Number(editPriceClp))
    const qty = Math.round(Number(editQuantity))
    if (!Number.isFinite(price) || price < 0) {
      setEditSingleError('Precio inválido')
      return
    }
    if (!Number.isFinite(qty) || qty < 1) {
      setEditSingleError('Cantidad inválida')
      return
    }
    try {
      await patchSingle.mutateAsync({
        id: editingSingle.id,
        patch: {
          condition: editCondition,
          language: editLanguage,
          priceClp: price,
          quantity: qty,
          note: editNote
        }
      })
      setEditSingleOpen(false)
      setEditingSingle(null)
    } catch (e) {
      setEditSingleError(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleOfferSave = async () => {
    if (!offerSingle) return
    setOfferError(null)
    const offer = Math.round(Number(offerPriceClp))
    const listPrice =
      offerSingle.compareAtPriceClp != null &&
      offerSingle.compareAtPriceClp > offerSingle.priceClp
        ? offerSingle.compareAtPriceClp
        : offerSingle.priceClp
    if (!Number.isFinite(offer) || offer < 0) {
      setOfferError('Precio de oferta inválido')
      return
    }
    if (offer >= listPrice) {
      setOfferError(`La oferta debe ser menor a ${formatClp(listPrice)}`)
      return
    }
    try {
      await patchSingle.mutateAsync({
        id: offerSingle.id,
        patch: {
          priceClp: offer,
          compareAtPriceClp: listPrice
        }
      })
      setOfferOpen(false)
      setOfferSingle(null)
    } catch (e) {
      setOfferError(e instanceof Error ? e.message : 'Error')
    }
  }

  const clearOffer = async (s: CardSingleDTO) => {
    setActionError(null)
    const restore =
      s.compareAtPriceClp != null && s.compareAtPriceClp > s.priceClp
        ? s.compareAtPriceClp
        : s.priceClp
    try {
      await patchSingle.mutateAsync({
        id: s.id,
        patch: {
          priceClp: restore,
          compareAtPriceClp: null
        }
      })
    } catch (e) {
      handlePatchError(e)
    }
  }

  const handlePatchError = (e: unknown) => {
    const err = e as Error & { code?: string }
    if (err.code === 'PHONE_REQUIRED') {
      setActionError(`${err.message} Ve a Perfil para agregarlo.`)
    } else {
      setActionError(err.message || 'No se pudo actualizar')
    }
  }

  const togglePublish = async (s: CardSingleDTO, published: boolean) => {
    setActionError(null)
    try {
      await patchSingle.mutateAsync({ id: s.id, patch: { published } })
    } catch (e) {
      handlePatchError(e)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const publishSelected = async () => {
    const ids = [...selectedIds]
    if (!ids.length) return
    setActionError(null)
    setBulkPending(true)
    try {
      for (const id of ids) {
        await patchSingle.mutateAsync({ id, patch: { published: true } })
      }
      setSelectedIds(new Set())
    } catch (e) {
      handlePatchError(e)
    } finally {
      setBulkPending(false)
    }
  }

  const singles = data?.singles ?? []
  const groups = useMemo(() => groupCardSingles(singles), [singles])

  if (isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Carpeta no encontrada'}
        </Alert>
        <Button component={Link} href="/dashboard/carpetas" sx={{ mt: 2 }}>
          Volver
        </Button>
      </Container>
    )
  }

  const { binder } = data

  const openEdit = () => {
    setEditName(binder.name)
    setEditDescription(binder.description ?? '')
    setEditSlug(binder.slug || slugFromCardBinderName(binder.name))
    setEditError(null)
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    setEditError(null)
    const n = editName.trim()
    if (!n) {
      setEditError('El nombre es obligatorio')
      return
    }
    const s = normalizeCardBinderSlug(
      editSlug.trim() || slugFromCardBinderName(n)
    )
    if (!isValidCardBinderSlug(s)) {
      setEditError(
        'Slug inválido. Usa 3–48 caracteres: minúsculas, números y guiones.'
      )
      return
    }
    try {
      await patchBinder.mutateAsync({
        id: binderId,
        patch: {
          name: n.slice(0, CARD_BINDER_NAME_MAX),
          description: editDescription
            .trim()
            .slice(0, CARD_BINDER_DESCRIPTION_MAX),
          slug: s
        }
      })
      setEditOpen(false)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Button
          component={Link}
          href="/dashboard/carpetas"
          startIcon={<ArrowBack />}
          size="small"
          sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
        >
          Carpetas
        </Button>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'flex-start' }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h4" component="h1" fontWeight={800}>
              {binder.name}
            </Typography>
            {binder.description ? (
              <Typography variant="body2" color="text.secondary">
                {binder.description}
              </Typography>
            ) : null}
            {binder.publicPath ? (
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                Link público:{' '}
                <Link href={binder.publicPath} target="_blank">
                  {binder.publicPath}
                </Link>
              </Typography>
            ) : (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Esta carpeta aún no tiene slug. Usa <strong>Editar</strong> para
                definir nombre, descripción y link público.
              </Alert>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={<EditOutlined />}
            onClick={openEdit}
            sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
          >
            Editar
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Agregar single
          </Typography>
          <LimitlessCardSearchField onPick={openAdd} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            Busca con Limitless. Si hay varias unidades con distinto idioma,
            estado o precio, activa “Detallar variantes”.
          </Typography>
        </Paper>

        {actionError ? (
          <Alert
            severity="warning"
            onClose={() => setActionError(null)}
            action={
              actionError.includes('Perfil') ? (
                <Button
                  color="inherit"
                  size="small"
                  component={Link}
                  href="/dashboard/perfil"
                >
                  Perfil
                </Button>
              ) : undefined
            }
          >
            {actionError}
          </Alert>
        ) : null}

        {!singles.length ? (
          <Typography color="text.secondary">
            Esta carpeta aún no tiene singles.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <FormControlLabel
                sx={{ ml: 0, mr: 1 }}
                control={
                  <Checkbox
                    size="small"
                    checked={
                      singles.length > 0 && selectedIds.size === singles.length
                    }
                    indeterminate={
                      selectedIds.size > 0 && selectedIds.size < singles.length
                    }
                    onChange={(_, checked) => {
                      setSelectedIds(
                        checked ? new Set(singles.map(s => s.id)) : new Set()
                      )
                    }}
                  />
                }
                label={
                  <Typography variant="body2">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} seleccionada${selectedIds.size === 1 ? '' : 's'}`
                      : 'Seleccionar'}
                  </Typography>
                }
              />
              {selectedIds.size > 0 ? (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={bulkPending || patchSingle.isPending}
                    onClick={() => void publishSelected()}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Publicar seleccionadas
                  </Button>
                  <Button
                    size="small"
                    disabled={bulkPending}
                    onClick={() => setSelectedIds(new Set())}
                    sx={{ textTransform: 'none' }}
                  >
                    Limpiar
                  </Button>
                </>
              ) : null}
            </Stack>

            {groups.map(group => (
              <Paper
                key={group.key}
                variant="outlined"
                sx={{ overflow: 'hidden' }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ p: 1.5, pb: group.variants.length > 1 ? 1 : 1.5 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={group.imageUrl}
                    alt=""
                    width={56}
                    height={78}
                    style={{ objectFit: 'contain', borderRadius: 4 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={800} noWrap>
                      {group.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.set} · {group.number}
                      {group.totalQuantity > 1
                        ? ` · ${group.totalQuantity} unidades`
                        : ''}
                      {group.variants.length > 1
                        ? ` · ${group.variants.length} variantes`
                        : ''}
                    </Typography>
                    {formatLimitlessMarketPriceUsd(group.marketPriceUsd) ? (
                      <Typography variant="caption" color="text.secondary">
                        Ref. mercado Limitless:{' '}
                        {formatLimitlessMarketPriceUsd(group.marketPriceUsd)}
                      </Typography>
                    ) : null}
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={
                      createSingle.isPending ||
                      patchSingle.isPending ||
                      bulkPending ||
                      splitPending
                    }
                    onClick={() => openSplitLanguage(group.variants[0])}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    Agregar variante
                  </Button>
                </Stack>

                <Stack
                  spacing={0}
                  sx={{
                    borderTop: theme => `1px solid ${theme.palette.divider}`
                  }}
                >
                  {group.variants.map(s => (
                    <Box
                      key={s.id}
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        display: 'flex',
                        gap: 1,
                        alignItems: 'flex-start',
                        borderBottom: theme =>
                          `1px solid ${theme.palette.divider}`,
                        '&:last-child': { borderBottom: 0 },
                        bgcolor: s.published
                          ? t => alpha(t.palette.success.main, 0.04)
                          : selectedIds.has(s.id)
                            ? t => alpha(t.palette.primary.main, 0.04)
                            : undefined
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        sx={{ mt: 0.25, p: 0.5 }}
                        inputProps={{
                          'aria-label': `Seleccionar variante ${s.name}`
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            label={CARD_SINGLE_LANGUAGE_LABELS[s.language]}
                          />
                          <Chip
                            size="small"
                            label={CARD_SINGLE_CONDITION_LABELS[s.condition]}
                          />
                          <Chip
                            size="small"
                            label={`x${s.quantity}`}
                            sx={{ fontWeight: 700 }}
                          />
                          {s.published ? (
                            <Chip
                              size="small"
                              color="success"
                              label="Publicado"
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="Borrador"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Stack
                          direction="row"
                          alignItems="baseline"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.5 }}
                        >
                          <Typography variant="subtitle1" fontWeight={700}>
                            {formatClp(s.priceClp)}
                          </Typography>
                          {s.compareAtPriceClp != null &&
                          s.compareAtPriceClp > s.priceClp ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textDecoration: 'line-through' }}
                            >
                              {formatClp(s.compareAtPriceClp)}
                            </Typography>
                          ) : null}
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          sx={{ mt: 0.25 }}
                        >
                          <FavoriteBorder sx={{ fontSize: 16, opacity: 0.7 }} />
                          <Typography variant="caption" color="text.secondary">
                            {s.interestCount} interesados
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.5 }}
                        >
                          <FormControlLabel
                            sx={{ ml: 0 }}
                            control={
                              <Switch
                                size="small"
                                checked={s.published}
                                disabled={patchSingle.isPending || bulkPending}
                                onChange={(_, v) => void togglePublish(s, v)}
                              />
                            }
                            label={s.published ? 'Público' : 'Publicar'}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={patchSingle.isPending || bulkPending}
                            onClick={() => openOffer(s)}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                          >
                            Aplicar oferta
                          </Button>
                          {s.compareAtPriceClp != null &&
                          s.compareAtPriceClp > s.priceClp ? (
                            <Button
                              size="small"
                              disabled={patchSingle.isPending || bulkPending}
                              onClick={() => void clearOffer(s)}
                              sx={{ textTransform: 'none' }}
                            >
                              Quitar oferta
                            </Button>
                          ) : null}
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={0}>
                        <IconButton
                          aria-label="Editar"
                          onClick={() => openEditSingle(s)}
                          disabled={bulkPending}
                        >
                          <EditOutlined />
                        </IconButton>
                        <IconButton
                          aria-label="Eliminar"
                          onClick={() => {
                            void deleteSingle.mutateAsync(s.id).then(() => {
                              setSelectedIds(prev => {
                                if (!prev.has(s.id)) return prev
                                const next = new Set(prev)
                                next.delete(s.id)
                                return next
                              })
                            })
                          }}
                          disabled={deleteSingle.isPending || bulkPending}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={editSingleOpen}
        onClose={() => !patchSingle.isPending && setEditSingleOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Editar single</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {editingSingle ? (
              <Typography variant="body2" fontWeight={600}>
                {editingSingle.name} · {editingSingle.set}{' '}
                {editingSingle.number}
              </Typography>
            ) : null}
            <FormControl size="small" fullWidth>
              <InputLabel id="edit-cond-label">Estado</InputLabel>
              <Select
                labelId="edit-cond-label"
                label="Estado"
                value={editCondition}
                onChange={e =>
                  setEditCondition(e.target.value as CardSingleCondition)
                }
              >
                {CARD_SINGLE_CONDITIONS.map(c => (
                  <MenuItem key={c} value={c}>
                    {CARD_SINGLE_CONDITION_LABELS[c]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required>
              <InputLabel id="edit-lang-label">Idioma</InputLabel>
              <Select
                labelId="edit-lang-label"
                label="Idioma"
                value={editLanguage}
                onChange={e =>
                  setEditLanguage(e.target.value as CardSingleLanguage)
                }
              >
                {CARD_SINGLE_LANGUAGES.map(l => (
                  <MenuItem key={l} value={l}>
                    {CARD_SINGLE_LANGUAGE_LABELS[l]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Precio de venta (CLP)"
              size="small"
              value={editPriceClp}
              onChange={e =>
                setEditPriceClp(e.target.value.replace(/[^\d]/g, ''))
              }
              inputMode="numeric"
              fullWidth
            />
            <TextField
              label="Cantidad"
              size="small"
              value={editQuantity}
              onChange={e =>
                setEditQuantity(e.target.value.replace(/[^\d]/g, ''))
              }
              inputMode="numeric"
              fullWidth
            />
            <TextField
              label="Nota (opcional)"
              size="small"
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            {editSingleError ? (
              <Alert severity="error">{editSingleError}</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditSingleOpen(false)}
            disabled={patchSingle.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleEditSingleSave()}
            disabled={patchSingle.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={offerOpen}
        onClose={() => !patchSingle.isPending && setOfferOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Aplicar oferta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {offerSingle ? (
              <>
                <Typography variant="body2" fontWeight={600}>
                  {offerSingle.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Precio actual:{' '}
                  <Box
                    component="span"
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {formatClp(offerSingle.priceClp)}
                  </Box>
                  {offerSingle.compareAtPriceClp != null &&
                  offerSingle.compareAtPriceClp > offerSingle.priceClp
                    ? ` (antes ${formatClp(offerSingle.compareAtPriceClp)})`
                    : ''}
                </Typography>
              </>
            ) : null}
            <TextField
              label="Precio de oferta (CLP)"
              size="small"
              value={offerPriceClp}
              onChange={e =>
                setOfferPriceClp(e.target.value.replace(/[^\d]/g, ''))
              }
              inputMode="numeric"
              fullWidth
              autoFocus
              helperText="Quedará el precio nuevo y el anterior tachado."
            />
            {offerError ? <Alert severity="error">{offerError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOfferOpen(false)}
            disabled={patchSingle.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleOfferSave()}
            disabled={patchSingle.isPending}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={splitOpen}
        onClose={() =>
          !splitPending &&
          !createSingle.isPending &&
          !patchSingle.isPending &&
          setSplitOpen(false)
        }
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Agregar variante</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {splitSource ? (
              <>
                <Typography variant="body2" fontWeight={600}>
                  {splitSource.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Misma carta, otra línea con idioma, estado, cantidad y precio
                  propios. Queda agrupada en el listado.
                </Typography>
              </>
            ) : null}
            <FormControl size="small" fullWidth required>
              <InputLabel id="split-lang-label">Idioma</InputLabel>
              <Select
                labelId="split-lang-label"
                label="Idioma"
                value={splitLanguage}
                onChange={e =>
                  setSplitLanguage(e.target.value as CardSingleLanguage)
                }
              >
                {CARD_SINGLE_LANGUAGES.map(l => (
                  <MenuItem key={l} value={l}>
                    {CARD_SINGLE_LANGUAGE_LABELS[l]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required>
              <InputLabel id="split-cond-label">Estado</InputLabel>
              <Select
                labelId="split-cond-label"
                label="Estado"
                value={splitCondition}
                onChange={e =>
                  setSplitCondition(e.target.value as CardSingleCondition)
                }
              >
                {CARD_SINGLE_CONDITIONS.map(c => (
                  <MenuItem key={c} value={c}>
                    {CARD_SINGLE_CONDITION_LABELS[c]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Precio (CLP)"
              size="small"
              value={splitPriceClp}
              onChange={e =>
                setSplitPriceClp(e.target.value.replace(/[^\d]/g, ''))
              }
              inputMode="numeric"
              fullWidth
              required
            />
            <TextField
              label="Cantidad"
              size="small"
              value={splitQuantity}
              onChange={e =>
                setSplitQuantity(e.target.value.replace(/[^\d]/g, ''))
              }
              inputMode="numeric"
              fullWidth
              required
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={splitDeduct}
                  onChange={(_, v) => setSplitDeduct(v)}
                  disabled={!splitSource || splitSource.quantity <= 1}
                />
              }
              label={
                splitSource && splitDeduct
                  ? `Restar del stock actual (quedaría x${Math.max(0, splitSource.quantity - (Math.round(Number(splitQuantity)) || 0))})`
                  : 'Restar esta cantidad del stock actual'
              }
            />
            {splitError ? <Alert severity="error">{splitError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitOpen(false)} disabled={splitPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSplitLanguage()}
            disabled={splitPending || createSingle.isPending}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => !patchBinder.isPending && setEditOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Editar carpeta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre"
              value={editName}
              onChange={e =>
                setEditName(e.target.value.slice(0, CARD_BINDER_NAME_MAX))
              }
              fullWidth
              size="small"
              required
              autoFocus
            />
            <TextField
              label="Descripción"
              value={editDescription}
              onChange={e =>
                setEditDescription(
                  e.target.value.slice(0, CARD_BINDER_DESCRIPTION_MAX)
                )
              }
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            <TextField
              label="Slug del link público"
              value={editSlug}
              onChange={e => {
                const raw = e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, CARD_BINDER_SLUG_MAX)
                setEditSlug(raw)
              }}
              onBlur={() => setEditSlug(normalizeCardBinderSlug(editSlug))}
              fullWidth
              size="small"
              required
              placeholder="full-art"
              helperText={
                normalizeCardBinderSlug(editSlug)
                  ? `Link: /carpetas/${normalizeCardBinderSlug(editSlug)}`
                  : 'Minúsculas, números y guiones.'
              }
              error={
                Boolean(editSlug) &&
                !isValidCardBinderSlug(normalizeCardBinderSlug(editSlug))
              }
            />
            {editError ? <Alert severity="error">{editError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditOpen(false)}
            disabled={patchBinder.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleEditSave()}
            disabled={patchBinder.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addOpen}
        onClose={() => !createSingle.isPending && setAddOpen(false)}
        fullWidth
        maxWidth={detailVariants ? 'sm' : 'xs'}
      >
        <DialogTitle>Agregar single</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {pick ? (
              <Typography variant="body2" fontWeight={600}>
                {pick.detail?.name ?? pick.hit.name} · {pick.hit.set}{' '}
                {pick.hit.number}
              </Typography>
            ) : null}
            {pick?.detail?.market_price != null &&
            formatLimitlessMarketPriceUsd(pick.detail.market_price) ? (
              <Typography variant="caption" color="text.secondary">
                Ref. mercado:{' '}
                {formatLimitlessMarketPriceUsd(pick.detail.market_price)}
              </Typography>
            ) : null}

            <FormControlLabel
              control={
                <Checkbox
                  checked={detailVariants}
                  onChange={(_, v) => {
                    setDetailVariants(v)
                    if (v && addVariants.length === 0) {
                      setAddVariants([
                        {
                          key: `v${Date.now()}`,
                          language,
                          condition,
                          quantity: quantity || '1',
                          priceClp
                        }
                      ])
                    }
                  }}
                />
              }
              label="Detallar variantes (idioma, estado y precio por grupo)"
            />

            {detailVariants ? (
              <Stack spacing={1.5}>
                {addVariants.map((row, idx) => (
                  <Paper key={row.key} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="caption" fontWeight={700}>
                          Variante {idx + 1}
                        </Typography>
                        {addVariants.length > 1 ? (
                          <IconButton
                            size="small"
                            aria-label="Quitar variante"
                            onClick={() =>
                              setAddVariants(prev =>
                                prev.filter(x => x.key !== row.key)
                              )
                            }
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                      <FormControl size="small" fullWidth required>
                        <InputLabel id={`add-lang-${row.key}`}>
                          Idioma
                        </InputLabel>
                        <Select
                          labelId={`add-lang-${row.key}`}
                          label="Idioma"
                          value={row.language}
                          onChange={e =>
                            setAddVariants(prev =>
                              prev.map(x =>
                                x.key === row.key
                                  ? {
                                      ...x,
                                      language: e.target
                                        .value as CardSingleLanguage
                                    }
                                  : x
                              )
                            )
                          }
                        >
                          {CARD_SINGLE_LANGUAGES.map(l => (
                            <MenuItem key={l} value={l}>
                              {CARD_SINGLE_LANGUAGE_LABELS[l]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" fullWidth>
                        <InputLabel id={`add-cond-${row.key}`}>
                          Estado
                        </InputLabel>
                        <Select
                          labelId={`add-cond-${row.key}`}
                          label="Estado"
                          value={row.condition}
                          onChange={e =>
                            setAddVariants(prev =>
                              prev.map(x =>
                                x.key === row.key
                                  ? {
                                      ...x,
                                      condition: e.target
                                        .value as CardSingleCondition
                                    }
                                  : x
                              )
                            )
                          }
                        >
                          {CARD_SINGLE_CONDITIONS.map(c => (
                            <MenuItem key={c} value={c}>
                              {CARD_SINGLE_CONDITION_LABELS[c]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Stack direction="row" spacing={1}>
                        <TextField
                          label="Cantidad"
                          size="small"
                          value={row.quantity}
                          onChange={e =>
                            setAddVariants(prev =>
                              prev.map(x =>
                                x.key === row.key
                                  ? {
                                      ...x,
                                      quantity: e.target.value.replace(
                                        /[^\d]/g,
                                        ''
                                      )
                                    }
                                  : x
                              )
                            )
                          }
                          inputMode="numeric"
                          fullWidth
                        />
                        <TextField
                          label="Precio CLP"
                          size="small"
                          value={row.priceClp}
                          onChange={e =>
                            setAddVariants(prev =>
                              prev.map(x =>
                                x.key === row.key
                                  ? {
                                      ...x,
                                      priceClp: e.target.value.replace(
                                        /[^\d]/g,
                                        ''
                                      )
                                    }
                                  : x
                              )
                            )
                          }
                          inputMode="numeric"
                          fullWidth
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
                <Button
                  size="small"
                  onClick={() =>
                    setAddVariants(prev => [
                      ...prev,
                      {
                        key: `v${Date.now()}`,
                        language:
                          CARD_SINGLE_LANGUAGES.find(
                            l => !prev.some(p => p.language === l)
                          ) ?? language,
                        condition,
                        quantity: '1',
                        priceClp: priceClp || prev[0]?.priceClp || ''
                      }
                    ])
                  }
                  sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                >
                  + Agregar variante
                </Button>
              </Stack>
            ) : (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel id="cond-label">Estado</InputLabel>
                  <Select
                    labelId="cond-label"
                    label="Estado"
                    value={condition}
                    onChange={e =>
                      setCondition(e.target.value as CardSingleCondition)
                    }
                  >
                    {CARD_SINGLE_CONDITIONS.map(c => (
                      <MenuItem key={c} value={c}>
                        {CARD_SINGLE_CONDITION_LABELS[c]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth required>
                  <InputLabel id="lang-label">Idioma</InputLabel>
                  <Select
                    labelId="lang-label"
                    label="Idioma"
                    value={language}
                    onChange={e =>
                      setLanguage(e.target.value as CardSingleLanguage)
                    }
                  >
                    {CARD_SINGLE_LANGUAGES.map(l => (
                      <MenuItem key={l} value={l}>
                        {CARD_SINGLE_LANGUAGE_LABELS[l]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Precio de venta (CLP)"
                  size="small"
                  value={priceClp}
                  onChange={e =>
                    setPriceClp(e.target.value.replace(/[^\d]/g, ''))
                  }
                  inputMode="numeric"
                  fullWidth
                />
                <TextField
                  label="Cantidad"
                  size="small"
                  value={quantity}
                  onChange={e =>
                    setQuantity(e.target.value.replace(/[^\d]/g, ''))
                  }
                  inputMode="numeric"
                  fullWidth
                />
              </>
            )}

            <TextField
              label="Nota (opcional)"
              size="small"
              value={note}
              onChange={e => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            {formError ? <Alert severity="error">{formError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAddOpen(false)}
            disabled={createSingle.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAdd()}
            disabled={createSingle.isPending}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
