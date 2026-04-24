'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FilterListIcon from '@mui/icons-material/FilterList'
import PostAddIcon from '@mui/icons-material/PostAdd'
import RemoveIcon from '@mui/icons-material/Remove'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import Drawer from '@mui/material/Drawer'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import ButtonBase from '@mui/material/ButtonBase'
import { alpha } from '@mui/material/styles'
import { DECKLIST_NUEVO_SESSION_TEXT_KEY } from '@/lib/decklist-nuevo-prefill'
import { limitlessCardImageUrl } from '@/lib/decklist'
import {
  buildDecklistExportText,
  isEnergyCardExemptFromFourCopyLimit,
  type DeckBuilderLine,
  type LimitlessDmCardDetail,
  type LimitlessDmFormat,
  type LimitlessDmSearchHit,
  type LimitlessDmTypeFilter
} from '@/lib/limitless-dm-api'

const MAX_DECK = 60
const MAX_COPIES = 4

const FORMAT_OPTIONS: { value: LimitlessDmFormat; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'expanded', label: 'Expanded' },
  { value: 'glc', label: 'GLC' }
]

const TYPE_OPTIONS: { value: LimitlessDmTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'energy', label: 'Energy' },
  { value: 'item', label: 'Item' },
  { value: 'supporter', label: 'Supporter' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'tool', label: 'Tool' },
  { value: 'basic_energy', label: 'Basic Energy' },
  { value: 'special_energy', label: 'Special Energy' }
]

function cardKey(set: string, number: string | number) {
  return `${set.toUpperCase()}-${String(number)}`
}

function thumbUrl(set: string, numStr: string, cardName?: string): string {
  return limitlessCardImageUrl({
    set,
    number: numStr,
    size: 'SM',
    cardName
  })
}

function formatLabel(v: LimitlessDmFormat) {
  return FORMAT_OPTIONS.find(o => o.value === v)?.label ?? v
}

function typeLabel(v: LimitlessDmTypeFilter) {
  return TYPE_OPTIONS.find(o => o.value === v)?.label ?? v
}

export default function DeckBuilderClient() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [debounced, setDebounced] = useState('')
  const [format, setFormat] = useState<LimitlessDmFormat>('standard')
  const [typeFilter, setTypeFilter] = useState<LimitlessDmTypeFilter>('all')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [deck, setDeck] = useState<Record<string, DeckBuilderLine>>({})
  const [detailHit, setDetailHit] = useState<LimitlessDmSearchHit | null>(null)
  const [snack, setSnack] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchText.trim()), 380)
    return () => clearTimeout(t)
  }, [searchText])

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ['limitless-search', debounced, format, typeFilter],
    queryFn: async (): Promise<LimitlessDmSearchHit[]> => {
      const params = new URLSearchParams({
        text: debounced,
        format
      })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/limitless/search?${params}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'Error en la búsqueda'
        )
      }
      return (j.results as LimitlessDmSearchHit[]) ?? []
    },
    enabled: debounced.length >= 1
  })

  const results = searchData ?? []

  const { data: cardDetail } = useQuery({
    queryKey: ['limitless-card', detailHit?.set, detailHit?.number] as const,
    queryFn: async (): Promise<LimitlessDmCardDetail | null> => {
      if (!detailHit) return null
      const params = new URLSearchParams({
        set: detailHit.set,
        number: String(detailHit.number)
      })
      const res = await fetch(`/api/limitless/cards?${params}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo cargar la carta'
        )
      }
      return j.card as LimitlessDmCardDetail
    },
    enabled: Boolean(detailHit)
  })

  const totalCards = useMemo(
    () => Object.values(deck).reduce((s, x) => s + x.count, 0),
    [deck]
  )

  const addCard = useCallback(
    (hit: LimitlessDmSearchHit, detail: LimitlessDmCardDetail | null) => {
      const cardType = (detail?.card_type ?? hit.card_type).toLowerCase()
      const name = detail?.name ?? hit.name
      setDeck(prev => {
        const key = cardKey(hit.set, hit.number)
        const cur = prev[key]
        const total = Object.values(prev).reduce((s, x) => s + x.count, 0)
        const nextCount = (cur?.count ?? 0) + 1
        if (
          !isEnergyCardExemptFromFourCopyLimit(name) &&
          nextCount > MAX_COPIES
        ) {
          return prev
        }
        if (total + 1 > MAX_DECK) return prev
        return {
          ...prev,
          [key]: {
            key,
            count: nextCount,
            name,
            set: hit.set.toUpperCase(),
            number: String(hit.number),
            cardType
          }
        }
      })
    },
    []
  )

  const addOneFromDeckLine = useCallback(
    (line: DeckBuilderLine) => {
      const hit: LimitlessDmSearchHit = {
        id: 0,
        card_type: line.cardType,
        region: '',
        set: line.set,
        number: line.number,
        name: line.name,
        translation: 0,
        special: null
      }
      addCard(hit, null)
    },
    [addCard]
  )

  const removeCard = useCallback((key: string) => {
    setDeck(prev => {
      const cur = prev[key]
      if (!cur) return prev
      const next = { ...prev }
      if (cur.count <= 1) delete next[key]
      else next[key] = { ...cur, count: cur.count - 1 }
      return next
    })
  }, [])

  const detailDeckKey = useMemo(
    () => (detailHit ? cardKey(detailHit.set, String(detailHit.number)) : null),
    [detailHit]
  )
  const detailInDeck = useMemo(
    () => (detailDeckKey != null ? (deck[detailDeckKey]?.count ?? 0) : 0),
    [detailDeckKey, deck]
  )

  const detailLineName = useMemo(
    () => cardDetail?.name ?? detailHit?.name ?? '',
    [cardDetail?.name, detailHit?.name]
  )

  const addOneInDetailDialog = useCallback(() => {
    if (!detailHit) return
    if (
      !isEnergyCardExemptFromFourCopyLimit(detailLineName) &&
      detailInDeck >= MAX_COPIES
    ) {
      return
    }
    if (totalCards >= MAX_DECK) return
    addCard(detailHit, cardDetail ?? null)
  }, [detailHit, cardDetail, detailLineName, detailInDeck, totalCards, addCard])

  const removeOneInDetailDialog = useCallback(() => {
    if (detailDeckKey == null) return
    removeCard(detailDeckKey)
  }, [detailDeckKey, removeCard])

  const exportText = useMemo(
    () => buildDecklistExportText(Object.values(deck)),
    [deck]
  )

  const copyExport = async () => {
    if (!exportText) return
    try {
      await navigator.clipboard.writeText(exportText)
      setSnack('Listado copiado al portapapeles')
    } catch {
      setSnack('No se pudo copiar')
    }
  }

  const goToCreateList = () => {
    try {
      if (exportText) {
        sessionStorage.setItem(DECKLIST_NUEVO_SESSION_TEXT_KEY, exportText)
      } else {
        sessionStorage.removeItem(DECKLIST_NUEVO_SESSION_TEXT_KEY)
      }
    } catch {
      // cuota o modo privado
    }
    router.push('/dashboard/decklists/nuevo?from=builder')
  }

  const openDetail = (hit: LimitlessDmSearchHit) => setDetailHit(hit)

  return (
    <>
      <Stack spacing={{ xs: 2, sm: 3 }}>
        <Stack spacing={0.75}>
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 800, letterSpacing: '0.12em' }}
          >
            Herramientas
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Armar mazo
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: '62ch' }}
          >
            Haz clic en un resultado para ajustar copias con −1 / +1, y llevate
            el listado a «Crear lista» o copialo al portapapeles.
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack spacing={2} useFlexGap sx={{ flexDirection: 'column' }}>
            {/* Misma estructura en SSR y cliente: visibilidad y orden vía `sx` (media queries) */}
            <Box
              sx={{
                display: { xs: 'none', md: 'block' },
                order: { xs: 0, md: 0 }
              }}
            >
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={800}>
                  Formato
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={format}
                  onChange={(_, v: LimitlessDmFormat | null) => {
                    if (v) setFormat(v)
                  }}
                  aria-label="Formato de juego"
                  sx={{ flexWrap: 'wrap' }}
                >
                  {FORMAT_OPTIONS.map(o => (
                    <ToggleButton key={o.value} value={o.value}>
                      {o.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Typography variant="subtitle2" fontWeight={800}>
                  Tipo de carta
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, minmax(0, 1fr))',
                      sm: 'repeat(3, minmax(0, 1fr))',
                      md: 'repeat(5, minmax(0, 1fr))'
                    },
                    gap: 0.75
                  }}
                >
                  {TYPE_OPTIONS.map(o => (
                    <Button
                      key={o.value}
                      variant={
                        typeFilter === o.value ? 'contained' : 'outlined'
                      }
                      size="small"
                      onClick={() => setTypeFilter(o.value)}
                      sx={{ py: 0.75, textTransform: 'none', fontWeight: 600 }}
                    >
                      {o.label}
                    </Button>
                  ))}
                </Box>
              </Stack>
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder="Nombre de carta (ej. wooper)"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon color="action" sx={{ mr: 1 }} aria-hidden />
                )
              }}
              aria-label="Buscar cartas"
              sx={{ order: { xs: 0, md: 1 } }}
            />
            <Button
              type="button"
              variant="outlined"
              color="primary"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterDrawerOpen(true)}
              sx={{
                order: { xs: 1, md: 2 },
                display: { xs: 'inline-flex', md: 'none' },
                alignSelf: 'flex-start',
                fontWeight: 700,
                flexWrap: 'wrap'
              }}
              aria-expanded={filterDrawerOpen}
              aria-controls="deck-builder-filters-drawer"
            >
              Filtros
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ ml: 1, fontWeight: 500 }}
              >
                ({formatLabel(format)} · {typeLabel(typeFilter)})
              </Typography>
            </Button>
          </Stack>
        </Paper>

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          useFlexGap
          spacing={2}
          alignItems="stretch"
        >
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 0,
              order: { xs: 1, lg: 0 },
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                Mazo
              </Typography>
              <Chip
                label={`${totalCards} / ${MAX_DECK}`}
                color={totalCards === MAX_DECK ? 'success' : 'default'}
                size="small"
                sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
              />
            </Stack>
            {Object.keys(deck).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Añade cartas desde la búsqueda (detalle → +1).
              </Typography>
            ) : (
              <Stack spacing={1}>
                {Object.values(deck)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(line => {
                    const src = thumbUrl(line.set, line.number, line.name)
                    return (
                      <Stack
                        key={line.key}
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        sx={{
                          py: 1,
                          px: 1.25,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: t => alpha(t.palette.text.primary, 0.02)
                        }}
                      >
                        <Chip
                          label={line.count}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 800, minWidth: 36 }}
                        />
                        <Box
                          sx={{
                            width: 44,
                            height: 62,
                            flexShrink: 0,
                            borderRadius: 0.75,
                            overflow: 'hidden',
                            bgcolor: 'action.hover'
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {line.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {line.set} {line.number}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0} alignItems="center">
                          <IconButton
                            size="small"
                            aria-label="Quitar una copia"
                            onClick={() => removeCard(line.key)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="Añadir una copia"
                            disabled={
                              (!isEnergyCardExemptFromFourCopyLimit(
                                line.name
                              ) &&
                                line.count >= MAX_COPIES) ||
                              totalCards >= MAX_DECK
                            }
                            onClick={() => addOneFromDeckLine(line)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    )
                  })}
              </Stack>
            )}
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 2 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                disabled={!exportText}
                onClick={() => void copyExport()}
              >
                Copiar listado
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PostAddIcon />}
                onClick={goToCreateList}
              >
                Crear lista
              </Button>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              flex: 1.15,
              minWidth: 0,
              order: { xs: 0 },
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 800, mb: 2 }}
            >
              Resultados
            </Typography>
            {searchLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            ) : debounced.length < 1 ? (
              <Typography variant="body2" color="text.secondary">
                Escribí al menos una letra para buscar.
              </Typography>
            ) : results.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin resultados. Probá otro nombre o cambiá formato / tipo.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))'
                  },
                  gap: 1.25
                }}
              >
                {results.map(hit => {
                  const src = thumbUrl(hit.set, String(hit.number), hit.name)
                  return (
                    <ButtonBase
                      key={`${hit.set}-${hit.number}-${hit.id}`}
                      onClick={() => openDetail(hit)}
                      sx={{
                        p: 0.75,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        textAlign: 'left',
                        textTransform: 'none',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        transition:
                          'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: t =>
                            `0 8px 24px -12px ${alpha(t.palette.primary.main, 0.35)}`
                        }
                      }}
                    >
                      <Box
                        sx={{
                          aspectRatio: '63 / 88',
                          borderRadius: 1,
                          overflow: 'hidden',
                          bgcolor: 'action.hover',
                          mb: 0.75
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.25
                        }}
                      >
                        {hit.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {hit.set} · {hit.number}
                      </Typography>
                    </ButtonBase>
                  )
                })}
              </Box>
            )}
          </Paper>
        </Stack>
      </Stack>

      <Drawer
        id="deck-builder-filters-drawer"
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            maxHeight: 'min(88vh, 640px)',
            px: 2,
            pt: 1.5,
            pb: 2
          }
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: 'divider',
            mx: 'auto',
            mb: 1.5
          }}
          aria-hidden
        />
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
          Filtros
        </Typography>
        <Stack
          spacing={2}
          sx={{ overflow: 'auto', maxHeight: 'calc(100% - 48px)' }}
        >
          <Typography variant="subtitle2" fontWeight={800}>
            Formato
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={format}
            onChange={(_, v: LimitlessDmFormat | null) => {
              if (v) setFormat(v)
            }}
            aria-label="Formato de juego"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {FORMAT_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Typography variant="subtitle2" fontWeight={800}>
            Tipo de carta
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 0.75
            }}
          >
            {TYPE_OPTIONS.map(o => (
              <Button
                key={o.value}
                variant={typeFilter === o.value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setTypeFilter(o.value)}
                sx={{ py: 0.75, textTransform: 'none', fontWeight: 600 }}
              >
                {o.label}
              </Button>
            ))}
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setFilterDrawerOpen(false)}
            sx={{ fontWeight: 800, mt: 1 }}
          >
            Listo
          </Button>
        </Stack>
      </Drawer>

      <Dialog
        open={Boolean(detailHit)}
        onClose={() => setDetailHit(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {cardDetail?.name ?? detailHit?.name ?? 'Carta'}
        </DialogTitle>
        <DialogContent>
          {detailHit ? (
            <Stack spacing={2.5} alignItems="center">
              <Box
                sx={{
                  maxWidth: 280,
                  mx: 'auto',
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: 2
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={limitlessCardImageUrl({
                    set: detailHit.set,
                    number: detailHit.number,
                    size: 'LG',
                    cardName: cardDetail?.name ?? detailHit.name
                  })}
                  alt=""
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {detailHit.set} · {detailHit.number}
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1.5}
                sx={{ pt: 0.5, width: '100%', maxWidth: 360 }}
              >
                <Button
                  variant="outlined"
                  size="large"
                  onClick={removeOneInDetailDialog}
                  disabled={detailInDeck < 1}
                  aria-label="Quitar una copia del mazo"
                  sx={{ minWidth: 64, fontWeight: 800 }}
                >
                  −1
                </Button>
                <Box
                  sx={{
                    textAlign: 'center',
                    minWidth: 120,
                    py: 0.5,
                    px: 1.5,
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: t => alpha(t.palette.text.primary, 0.03)
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ fontWeight: 700, letterSpacing: '0.04em' }}
                  >
                    En el mazo
                  </Typography>
                  <Typography
                    component="p"
                    variant="h5"
                    fontWeight={800}
                    sx={{ lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {detailInDeck}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={addOneInDetailDialog}
                  disabled={
                    (!isEnergyCardExemptFromFourCopyLimit(detailLineName) &&
                      detailInDeck >= MAX_COPIES) ||
                    totalCards >= MAX_DECK
                  }
                  aria-label="Añadir una copia al mazo"
                  sx={{ minWidth: 64, fontWeight: 800 }}
                >
                  +1
                </Button>
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDetailHit(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack}
      />
    </>
  )
}
