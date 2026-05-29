'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
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
import LinearProgress from '@mui/material/LinearProgress'
import ButtonBase from '@mui/material/ButtonBase'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import { DECKLIST_NUEVO_SESSION_TEXT_KEY } from '@/lib/decklist-nuevo-prefill'
import {
  limitlessCardImageUrl,
  parseDecklistText,
  type DeckSectionId
} from '@/lib/decklist'
import {
  buildDecklistExportText,
  deckSectionFromCardType,
  isEnergyCardExemptFromFourCopyLimit,
  type DeckBuilderLine,
  type LimitlessDmCardDetail,
  type LimitlessDmFormat,
  type LimitlessDmSearchHit,
  type LimitlessDmTypeFilter
} from '@/lib/limitless-dm-api'

const MAX_DECK = 60
const MAX_COPIES = 4

const DECK_SECTION_ORDER = ['pokemon', 'trainer', 'energy'] as const

const DECK_SECTION_LABELS: Record<(typeof DECK_SECTION_ORDER)[number], string> =
  {
    pokemon: 'Pokémon',
    trainer: 'Trainer',
    energy: 'Energy'
  }

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

const btnPressFeedback: SxProps<Theme> = {
  transition:
    'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
  '&:active': { transform: 'translateY(1px)' }
}

const formatToggleGroupSx: SxProps<Theme> = {
  flexWrap: 'wrap',
  gap: 0.75,
  ...btnPressFeedback,
  '& .MuiToggleButton-root': {
    fontWeight: 700,
    textTransform: 'none',
    px: 2.25,
    py: 0.9,
    borderRadius: '10px !important',
    borderWidth: 2,
    borderColor: t => alpha(t.palette.primary.main, 0.38),
    color: 'primary.dark',
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      borderColor: 'primary.main',
      boxShadow: t => `0 3px 10px -3px ${alpha(t.palette.primary.main, 0.5)}`,
      '&:hover': { bgcolor: 'primary.dark' }
    },
    '&:hover': { bgcolor: t => alpha(t.palette.primary.main, 0.1) }
  }
}

function typeFilterButtonSx(active: boolean): SxProps<Theme> {
  return {
    py: 1,
    textTransform: 'none',
    fontWeight: 700,
    ...btnPressFeedback,
    ...(active
      ? {
          boxShadow: t =>
            `0 2px 8px -3px ${alpha(t.palette.primary.main, 0.45)}`
        }
      : {
          borderWidth: 2,
          borderColor: t => alpha(t.palette.primary.main, 0.42),
          color: 'primary.dark',
          bgcolor: 'background.paper',
          '&:hover': {
            borderWidth: 2,
            borderColor: 'primary.main',
            bgcolor: t => alpha(t.palette.primary.main, 0.08)
          }
        })
  }
}

const deckPanelSx: SxProps<Theme> = {
  p: { xs: 2, sm: 2.5 },
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: t =>
    t.palette.mode === 'dark'
      ? 'none'
      : `0 1px 0 ${alpha(t.palette.primary.main, 0.05)}, 0 16px 48px -28px ${alpha(t.palette.primary.main, 0.14)}`
}

const sectionLabelSx: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  textTransform: 'none',
  color: 'text.secondary'
}

const deckCountBadgeSx: SxProps<Theme> = {
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  height: 30,
  borderRadius: 1,
  border: '1px solid',
  borderColor: t => alpha(t.palette.primary.main, 0.28),
  bgcolor: t => alpha(t.palette.primary.main, 0.1),
  color: 'primary.dark',
  '& .MuiChip-label': { px: 1.25, py: 0 }
}

const mazoActionsSx: SxProps<Theme> = {
  flexShrink: 0,
  gap: 1,
  width: { xs: '100%', md: 'auto' },
  '& .MuiButton-root': { flex: { xs: 1, sm: 'none' } }
}

const mazoBtnBase: SxProps<Theme> = {
  textTransform: 'none',
  fontWeight: 700,
  px: 1.75,
  py: 0.85,
  borderRadius: 1.25,
  whiteSpace: 'nowrap',
  ...btnPressFeedback
}

const mazoBtnSoft: SxProps<Theme> = {
  ...mazoBtnBase,
  bgcolor: t => alpha(t.palette.primary.main, 0.16),
  color: 'primary.dark',
  border: '2px solid',
  borderColor: t => alpha(t.palette.primary.main, 0.32),
  boxShadow: 'none',
  '&:hover': {
    bgcolor: t => alpha(t.palette.primary.main, 0.24),
    borderColor: 'primary.main',
    boxShadow: t => `0 4px 12px -4px ${alpha(t.palette.primary.main, 0.42)}`
  }
}

const mazoBtnOutlined: SxProps<Theme> = {
  ...mazoBtnBase,
  borderWidth: 2,
  borderColor: t => alpha(t.palette.primary.main, 0.48),
  bgcolor: 'background.paper',
  color: 'primary.dark',
  '&:hover': {
    borderWidth: 2,
    borderColor: 'primary.main',
    bgcolor: t => alpha(t.palette.primary.main, 0.06),
    boxShadow: t => `0 4px 12px -4px ${alpha(t.palette.primary.main, 0.35)}`
  },
  '&.Mui-disabled': { borderWidth: 2, opacity: 0.55 }
}

const mazoBtnPrimary: SxProps<Theme> = {
  ...mazoBtnBase,
  fontWeight: 800,
  boxShadow: t => `0 4px 14px -4px ${alpha(t.palette.primary.main, 0.5)}`,
  '&:hover': {
    boxShadow: t => `0 6px 18px -6px ${alpha(t.palette.primary.main, 0.55)}`
  }
}

const mobileFiltersBtnSx: SxProps<Theme> = {
  ...mazoBtnBase,
  borderWidth: 2,
  borderColor: 'primary.main',
  bgcolor: t => alpha(t.palette.primary.main, 0.1),
  color: 'primary.dark',
  fontWeight: 800,
  '&:hover': {
    bgcolor: t => alpha(t.palette.primary.main, 0.18),
    borderWidth: 2
  }
}

const drawerDoneBtnSx: SxProps<Theme> = {
  ...mazoBtnPrimary,
  mt: 1,
  py: 1.25
}

const deckLineStepperSx: SxProps<Theme> = {
  flexShrink: 0,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  overflow: 'hidden',
  bgcolor: t => alpha(t.palette.text.primary, 0.03),
  '& .MuiIconButton-root': {
    borderRadius: 0,
    width: 36,
    height: 36,
    '&:hover': { bgcolor: t => alpha(t.palette.primary.main, 0.1) }
  }
}

/** Filas del mazo: 1 col en móvil, 2 en desktop (md+). */
const deckLinesGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
  '& > *': {
    minWidth: 0,
    borderTop: '1px solid',
    borderColor: 'divider'
  },
  '& > *:nth-of-type(odd)': {
    borderRight: { xs: 'none', md: '1px solid' },
    borderColor: 'divider'
  }
}

const searchFieldSx: SxProps<Theme> = {
  order: { xs: 0, md: 1 },
  '& .MuiOutlinedInput-root': {
    bgcolor: 'background.paper',
    borderRadius: 1.5,
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    '& fieldset': {
      borderWidth: 2,
      borderColor: t => alpha(t.palette.primary.main, 0.22)
    },
    '&:hover fieldset': {
      borderColor: t => alpha(t.palette.primary.main, 0.4)
    },
    '&.Mui-focused': {
      boxShadow: t => `0 0 0 3px ${alpha(t.palette.primary.main, 0.12)}`,
      '& fieldset': { borderColor: 'primary.main', borderWidth: 2 }
    }
  }
}

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

function cardTypeFromDeckSection(id: DeckSectionId): string {
  if (id === 'pokemon') return 'pokemon'
  if (id === 'energy') return 'energy'
  return 'trainer'
}

function deckLinesFromPastedText(text: string): {
  lines: DeckBuilderLine[]
  unknownCount: number
  trimmedCopies: number
} {
  const parsed = parseDecklistText(text)
  const aggregated = new Map<string, DeckBuilderLine>()

  for (const section of parsed.sections) {
    const cardType = cardTypeFromDeckSection(section.id)
    for (const card of section.cards) {
      const key = cardKey(card.set, card.number)
      const prev = aggregated.get(key)
      if (prev) prev.count += card.count
      else {
        aggregated.set(key, {
          key,
          count: card.count,
          name: card.name,
          set: card.set.toUpperCase(),
          number: String(card.number),
          cardType
        })
      }
    }
  }

  const lines: DeckBuilderLine[] = []
  let total = 0
  let trimmedCopies = 0

  for (const line of aggregated.values()) {
    let count = line.count
    if (!isEnergyCardExemptFromFourCopyLimit(line.name) && count > MAX_COPIES) {
      trimmedCopies += count - MAX_COPIES
      count = MAX_COPIES
    }
    const room = MAX_DECK - total
    if (room <= 0) {
      trimmedCopies += count
      continue
    }
    if (count > room) {
      trimmedCopies += count - room
      count = room
    }
    total += count
    lines.push({ ...line, count })
  }

  return { lines, unknownCount: parsed.unknownLines.length, trimmedCopies }
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
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

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

  const deckSections = useMemo(() => {
    const buckets: Record<
      (typeof DECK_SECTION_ORDER)[number],
      DeckBuilderLine[]
    > = { pokemon: [], trainer: [], energy: [] }
    for (const line of Object.values(deck)) {
      buckets[deckSectionFromCardType(line.cardType)].push(line)
    }
    for (const id of DECK_SECTION_ORDER) {
      buckets[id].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }
    return DECK_SECTION_ORDER.map(id => ({
      id,
      label: DECK_SECTION_LABELS[id],
      lines: buckets[id]
    })).filter(s => s.lines.length > 0)
  }, [deck])

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

  const applyPastedDecklistText = useCallback((text: string): boolean => {
    const { lines, unknownCount, trimmedCopies } = deckLinesFromPastedText(text)
    if (lines.length === 0) {
      setSnack(
        unknownCount > 0
          ? 'No se reconocieron cartas. Usá líneas tipo «4 Nombre SET 123».'
          : 'El texto está vacío o no tiene cartas válidas.'
      )
      return false
    }
    const next: Record<string, DeckBuilderLine> = {}
    for (const line of lines) next[line.key] = line
    setDeck(next)
    const total = lines.reduce((s, l) => s + l.count, 0)
    const parts = [`${total} cartas importadas`]
    if (unknownCount > 0) {
      parts.push(`${unknownCount} línea(s) sin reconocer`)
    }
    if (trimmedCopies > 0) {
      parts.push(`${trimmedCopies} copia(s) omitidas (máx. 4 o 60)`)
    }
    setSnack(parts.join('. '))
    return true
  }, [])

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        setPasteText('')
        setPasteOpen(true)
        return
      }
      if (!applyPastedDecklistText(text)) {
        setPasteText(text)
        setPasteOpen(true)
      }
    } catch {
      setPasteText('')
      setPasteOpen(true)
    }
  }

  const importPastedFromDialog = () => {
    if (applyPastedDecklistText(pasteText)) setPasteOpen(false)
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
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              textWrap: 'balance'
            }}
          >
            Armar mazo
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: '62ch', lineHeight: 1.6, textWrap: 'pretty' }}
          >
            Haz clic en un resultado para ajustar copias con −1 / +1, y llevate
            el listado a «Crear lista» o copialo al portapapeles.
          </Typography>
        </Stack>

        <Paper elevation={0} sx={deckPanelSx}>
          <Stack spacing={2} useFlexGap sx={{ flexDirection: 'column' }}>
            {/* Misma estructura en SSR y cliente: visibilidad y orden vía `sx` (media queries) */}
            <Box
              sx={{
                display: { xs: 'none', md: 'block' },
                order: { xs: 0, md: 0 }
              }}
            >
              <Stack spacing={2}>
                <Typography component="p" sx={sectionLabelSx}>
                  Formato
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={format}
                  onChange={(_, v: LimitlessDmFormat | null) => {
                    if (v) setFormat(v)
                  }}
                  aria-label="Formato de juego"
                  sx={formatToggleGroupSx}
                >
                  {FORMAT_OPTIONS.map(o => (
                    <ToggleButton key={o.value} value={o.value}>
                      {o.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Typography component="p" sx={sectionLabelSx}>
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
                      color="primary"
                      onClick={() => setTypeFilter(o.value)}
                      sx={typeFilterButtonSx(typeFilter === o.value)}
                    >
                      {o.label}
                    </Button>
                  ))}
                </Box>
              </Stack>
            </Box>

            <TextField
              id="deck-builder-card-search"
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
              sx={searchFieldSx}
            />
            <Button
              type="button"
              variant="outlined"
              color="primary"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterDrawerOpen(true)}
              sx={{
                ...mobileFiltersBtnSx,
                order: { xs: 1, md: 2 },
                display: { xs: 'inline-flex', md: 'none' },
                alignSelf: 'flex-start',
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
              ...deckPanelSx,
              flex: 1,
              minWidth: 0,
              order: { xs: 1, lg: 0 }
            }}
          >
            <Stack spacing={2} sx={{ mb: 2.5 }}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                alignItems={{ xs: 'stretch', lg: 'center' }}
                justifyContent="space-between"
                spacing={1.5}
                useFlexGap
              >
                <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.25}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Typography
                      variant="h6"
                      component="h2"
                      sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                    >
                      Mazo
                    </Typography>
                    <Chip
                      label={`${totalCards} / ${MAX_DECK}`}
                      size="small"
                      color={totalCards === MAX_DECK ? 'success' : 'default'}
                      sx={deckCountBadgeSx}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (totalCards / MAX_DECK) * 100)}
                    aria-label="Progreso del mazo"
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: t => alpha(t.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': { borderRadius: 1 }
                    }}
                  />
                </Stack>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  useFlexGap
                  sx={mazoActionsSx}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    disableElevation
                    startIcon={<ContentPasteIcon />}
                    onClick={() => void pasteFromClipboard()}
                    sx={mazoBtnSoft}
                  >
                    Pegar lista
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ContentCopyIcon />}
                    disabled={!exportText}
                    onClick={() => void copyExport()}
                    sx={mazoBtnOutlined}
                  >
                    Copiar listado
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PostAddIcon />}
                    onClick={goToCreateList}
                    sx={mazoBtnPrimary}
                  >
                    Crear lista
                  </Button>
                </Stack>
              </Stack>
            </Stack>
            {Object.keys(deck).length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  px: 2,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  border: '1px dashed',
                  borderColor: t => alpha(t.palette.primary.main, 0.28),
                  bgcolor: t => alpha(t.palette.primary.main, 0.04)
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5 }}
                >
                  El mazo está vacío
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Buscá cartas a la derecha o usá «Pegar lista» para importar un
                  bloque de texto.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  overflow: 'hidden'
                }}
              >
                {deckSections.map((section, sectionIndex) => {
                  const sectionTotal = section.lines.reduce(
                    (s, l) => s + l.count,
                    0
                  )
                  return (
                    <Box key={section.id}>
                      <Stack
                        direction="row"
                        alignItems="baseline"
                        justifyContent="space-between"
                        sx={{
                          px: 1.5,
                          py: 0.85,
                          ...(sectionIndex > 0 && {
                            borderTop: '1px solid',
                            borderColor: 'divider'
                          }),
                          bgcolor: t => alpha(t.palette.primary.main, 0.06)
                        }}
                      >
                        <Typography
                          component="p"
                          sx={{
                            ...sectionLabelSx,
                            color: 'primary.dark',
                            fontWeight: 800
                          }}
                        >
                          {section.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          {sectionTotal}
                        </Typography>
                      </Stack>
                      <Box sx={deckLinesGridSx}>
                        {section.lines.map(line => {
                          const src = thumbUrl(line.set, line.number, line.name)
                          return (
                            <Stack
                              key={line.key}
                              direction="row"
                              spacing={1.5}
                              alignItems="center"
                              sx={{
                                py: 1.25,
                                px: 1.5,
                                bgcolor: t =>
                                  alpha(t.palette.text.primary, 0.015),
                                transition: 'background-color 0.15s ease',
                                '&:hover': {
                                  bgcolor: t =>
                                    alpha(t.palette.primary.main, 0.05)
                                }
                              }}
                            >
                              <Box
                                sx={{
                                  width: 48,
                                  height: 67,
                                  flexShrink: 0,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  bgcolor: 'action.hover',
                                  boxShadow: t =>
                                    `0 2px 8px -4px ${alpha(t.palette.common.black, 0.2)}`
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
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  noWrap
                                  sx={{ letterSpacing: '-0.01em' }}
                                >
                                  {line.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 600
                                  }}
                                >
                                  {line.set} · {line.number}
                                </Typography>
                              </Box>
                              <Stack
                                direction="row"
                                alignItems="center"
                                sx={deckLineStepperSx}
                              >
                                <IconButton
                                  size="small"
                                  aria-label="Quitar una copia"
                                  onClick={() => removeCard(line.key)}
                                >
                                  <RemoveIcon fontSize="small" />
                                </IconButton>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  fontWeight={800}
                                  sx={{
                                    minWidth: 28,
                                    textAlign: 'center',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: 'primary.dark',
                                    borderLeft: '1px solid',
                                    borderRight: '1px solid',
                                    borderColor: 'divider',
                                    py: 0.75,
                                    px: 0.5
                                  }}
                                >
                                  {line.count}
                                </Typography>
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
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              ...deckPanelSx,
              flex: 1.15,
              minWidth: 0,
              order: { xs: 0 }
            }}
          >
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2 }}
            >
              Resultados
            </Typography>
            {searchLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            ) : debounced.length < 1 ? (
              <Box
                sx={{
                  py: 5,
                  px: 2,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  bgcolor: t => alpha(t.palette.text.primary, 0.03)
                }}
              >
                <SearchIcon
                  sx={{ fontSize: 32, color: 'action.disabled', mb: 1 }}
                  aria-hidden
                />
                <Typography variant="body2" color="text.secondary">
                  Escribí al menos una letra para buscar.
                </Typography>
              </Box>
            ) : results.length === 0 ? (
              <Box
                sx={{
                  py: 5,
                  px: 2,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  bgcolor: t => alpha(t.palette.text.primary, 0.03)
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Sin resultados. Probá otro nombre o cambiá formato / tipo.
                </Typography>
              </Box>
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
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        transition:
                          'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          transform: 'translateY(-2px)',
                          boxShadow: t =>
                            `0 10px 28px -14px ${alpha(t.palette.primary.main, 0.38)}`
                        },
                        '&:active': { transform: 'translateY(0)' }
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
          <Typography component="p" sx={sectionLabelSx}>
            Formato
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={format}
            onChange={(_, v: LimitlessDmFormat | null) => {
              if (v) setFormat(v)
            }}
            aria-label="Formato de juego"
            sx={formatToggleGroupSx}
          >
            {FORMAT_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Typography component="p" sx={sectionLabelSx}>
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
                color="primary"
                onClick={() => setTypeFilter(o.value)}
                sx={typeFilterButtonSx(typeFilter === o.value)}
              >
                {o.label}
              </Button>
            ))}
          </Box>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => setFilterDrawerOpen(false)}
            sx={drawerDoneBtnSx}
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

      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Pegar listado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pegá el bloque completo (Pokémon, Trainer, Energy…). Cada carta en
            una línea tipo «4 Nombre SET 123».
          </Typography>
          <TextField
            id="deck-builder-paste-list"
            multiline
            minRows={10}
            fullWidth
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={`Pokémon: 21\n4 Cynthia's Gible DRI 102\n\nTrainer: 31\n...`}
            aria-label="Texto del listado a importar"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasteOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={importPastedFromDialog}
            disabled={!pasteText.trim()}
            sx={{ fontWeight: 700 }}
          >
            Importar
          </Button>
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
