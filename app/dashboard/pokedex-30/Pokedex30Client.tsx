'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useSession } from 'next-auth/react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import Search from '@mui/icons-material/Search'
import {
  POKEDEX_30_CARDS,
  type Pokedex30Card,
  type Pokedex30Section
} from '@/lib/pokedex-30-cards'

const TYPE_COLOR: Record<string, string> = {
  Planta: '#3d8c5a',
  Fuego: '#d4652f',
  Agua: '#3a7ca5',
  Rayo: '#c4a035',
  Psiquico: '#a85d8a',
  Lucha: '#b5523a',
  Siniestro: '#4d5160',
  Metal: '#6e7c86',
  Dragon: '#7a6248',
  Incoloro: '#8a8175',
  Entrenador: '#5c6b62'
}

type SectionFilter = 'all' | Pokedex30Section
type OwnedFilter = 'all' | 'owned' | 'missing'

function storageKey(userId: string) {
  return `tcgfamily-pokedex-30:${userId || 'anon'}`
}

const EMPTY_OWNED = new Set<string>()
const ownedListeners = new Set<() => void>()
const ownedByUser = new Map<string, Set<string>>()

function subscribeOwned(onStoreChange: () => void) {
  ownedListeners.add(onStoreChange)
  return () => {
    ownedListeners.delete(onStoreChange)
  }
}

function readOwned(userId: string) {
  const cached = ownedByUser.get(userId)
  if (cached) return cached
  let ids: string[] = []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    ids = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    ids = []
  }
  const next = new Set(ids)
  ownedByUser.set(userId, next)
  return next
}

function writeOwned(userId: string, next: Set<string>) {
  ownedByUser.set(userId, next)
  localStorage.setItem(storageKey(userId), JSON.stringify([...next]))
  ownedListeners.forEach(listener => listener())
}

function subscribeClientReady() {
  return () => {}
}

const TYPE_LABEL: Record<string, string> = {
  Psiquico: 'Psíquico',
  Dragon: 'Dragón'
}

function typeLabel(type: string) {
  return TYPE_LABEL[type] ?? type
}

function printedLabel(card: Pokedex30Card) {
  if (card.section === 'classic' || card.rarity === 'Mew RGB')
    return card.printed
  return `${String(card.number).padStart(3, '0')}/128`
}

export default function Pokedex30Client() {
  const { data: session } = useSession()
  const userId = session?.user?.id ? String(session.user.id) : ''
  const owned = useSyncExternalStore(
    subscribeOwned,
    () => readOwned(userId),
    () => EMPTY_OWNED
  )
  const ready = useSyncExternalStore(
    subscribeClientReady,
    () => true,
    () => false
  )
  const [section, setSection] = useState<SectionFilter>('all')
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>('all')
  const [type, setType] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Pokedex30Card | null>(null)

  const toggle = (id: string) => {
    const next = new Set(owned)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    writeOwned(userId, next)
  }

  const types = useMemo(
    () => [...new Set(POKEDEX_30_CARDS.map(card => card.type))],
    []
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return POKEDEX_30_CARDS.filter(card => {
      if (section === 'pikachu' && card.section !== 'pikachu') return false
      if (
        section === 'main' &&
        (card.section === 'secret' || card.section === 'classic')
      ) {
        return false
      }
      if (section === 'secret' && card.section !== 'secret') return false
      if (section === 'classic' && card.section !== 'classic') return false
      if (type !== 'all' && card.type !== type) return false
      const has = owned.has(card.id)
      if (ownedFilter === 'owned' && !has) return false
      if (ownedFilter === 'missing' && has) return false
      if (!q) return true
      return (
        card.name.toLowerCase().includes(q) ||
        printedLabel(card).toLowerCase().includes(q) ||
        card.rarity.toLowerCase().includes(q)
      )
    })
  }, [owned, ownedFilter, query, section, type])

  const ownedCount = POKEDEX_30_CARDS.filter(card => owned.has(card.id)).length
  const total = POKEDEX_30_CARDS.length
  const progress = total === 0 ? 0 : Math.round((ownedCount / total) * 100)

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ md: 'flex-end' }}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            Pokémon TCG · set 30C
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            Pokédex 30th Celebration
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 560 }}
          >
            Las 158 cartas del set, las 3 Mew RGB y las 30 de Classic
            Collection. Toca una carta para marcarla. La lupa abre la imagen
            grande. El avance queda guardado en este navegador.
          </Typography>
        </Box>
        <Box sx={{ minWidth: { md: 220 } }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {ownedCount} de {total} · {progress}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 99 }}
          />
        </Box>
      </Stack>

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={section}
          onChange={(_, value: SectionFilter | null) =>
            value && setSection(value)
          }
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="all">Todas</ToggleButton>
          <ToggleButton value="main">Principal</ToggleButton>
          <ToggleButton value="pikachu">30 Pikachu</ToggleButton>
          <ToggleButton value="secret">Secretas</ToggleButton>
          <ToggleButton value="classic">Clásicas</ToggleButton>
        </ToggleButtonGroup>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            label="Buscar"
            placeholder="Nombre o número"
            value={query}
            onChange={event => setQuery(event.target.value)}
            sx={{ flex: 1 }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={ownedFilter}
            onChange={(_, value: OwnedFilter | null) =>
              value && setOwnedFilter(value)
            }
          >
            <ToggleButton value="all">Todas</ToggleButton>
            <ToggleButton value="owned">Tengo</ToggleButton>
            <ToggleButton value="missing">Me faltan</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          <Chip
            label="Cualquier tipo"
            size="small"
            variant={type === 'all' ? 'filled' : 'outlined'}
            onClick={() => setType('all')}
          />
          {types.map(item => (
            <Chip
              key={item}
              label={typeLabel(item)}
              size="small"
              variant={type === item ? 'filled' : 'outlined'}
              onClick={() => setType(item)}
              sx={
                type === item
                  ? { bgcolor: TYPE_COLOR[item], color: '#fff' }
                  : undefined
              }
            />
          ))}
        </Stack>
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 1 }}
      >
        {visible.length} cartas en esta vista
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))'
          },
          gap: 1.25
        }}
      >
        {visible.map(card => {
          const has = owned.has(card.id)
          return (
            <Box
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(card.id)}
              onKeyDown={event => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggle(card.id)
                }
              }}
              sx={{
                position: 'relative',
                textAlign: 'left',
                p: 1,
                borderRadius: 2,
                border: 1,
                borderColor: has ? 'success.main' : 'divider',
                bgcolor: 'background.paper',
                cursor: 'pointer',
                color: 'inherit',
                opacity: ready && !has ? 0.72 : 1,
                '&:active': { transform: 'scale(0.98)' }
              }}
            >
              <IconButton
                size="small"
                aria-label={`Ver ${card.name}`}
                onClick={event => {
                  event.stopPropagation()
                  setSelected(card)
                }}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'background.paper' }
                }}
              >
                <Search fontSize="small" />
              </IconButton>
              <Box
                sx={{
                  aspectRatio: '63 / 88',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'action.hover',
                  mb: 0.75,
                  filter: ready && !has ? 'grayscale(0.85)' : 'none'
                }}
              >
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt=""
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{ height: '100%', px: 1 }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {card.name}
                    </Typography>
                  </Stack>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {printedLabel(card)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                {card.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: TYPE_COLOR[card.type] }}
              >
                {typeLabel(card.type)}
              </Typography>
            </Box>
          )
        })}
      </Box>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="xs"
        fullWidth
      >
        {selected ? (
          <DialogContent>
            <Typography variant="overline" color="text.secondary">
              {printedLabel(selected)} · {selected.rarity}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              {selected.name}
            </Typography>
            {selected.imageLarge ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.imageLarge}
                alt=""
                style={{ width: '100%', borderRadius: 12 }}
              />
            ) : null}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 2 }}>
              <Chip label={typeLabel(selected.type)} size="small" />
              <Chip
                label={owned.has(selected.id) ? 'En tu colección' : 'Te falta'}
                size="small"
                color={owned.has(selected.id) ? 'success' : 'default'}
              />
            </Stack>
            <Button
              fullWidth
              variant="contained"
              onClick={() => toggle(selected.id)}
            >
              {owned.has(selected.id) ? 'Quitar de mi Pokédex' : 'La tengo'}
            </Button>
          </DialogContent>
        ) : null}
      </Dialog>
    </Box>
  )
}
