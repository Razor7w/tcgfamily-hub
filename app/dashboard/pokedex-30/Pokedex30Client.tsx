'use client'

import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import Search from '@mui/icons-material/Search'
import ShareOutlined from '@mui/icons-material/ShareOutlined'
import ChevronRight from '@mui/icons-material/ChevronRight'
import {
  POKEDEX_30_CARDS,
  type Pokedex30Card,
  type Pokedex30Section
} from '@/lib/pokedex-30-cards'
import {
  buildPokedex30ShareMessage,
  type Pokedex30ShareOwned,
  type Pokedex30ShareScope
} from '@/lib/pokedex-30-share'

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

function pokedexQueryKey(userId: string) {
  return ['me', 'pokedex-30', userId] as const
}

function readLocalCardIds(userId: string) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

async function savePokedex(cardIds: string[]) {
  const res = await fetch('/api/me/pokedex-30', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardIds })
  })
  if (!res.ok) throw new Error('No se pudo guardar la Pokédex')
  const body = (await res.json()) as { cardIds?: string[] }
  return body.cardIds ?? cardIds
}

async function loadPokedex(userId: string) {
  const res = await fetch('/api/me/pokedex-30')
  if (!res.ok) throw new Error('No se pudo leer la Pokédex')
  const body = (await res.json()) as { cardIds?: string[] }
  const remote = body.cardIds ?? []
  const local = readLocalCardIds(userId)
  const merged = [...new Set([...remote, ...local])]
  if (local.length === 0) return remote
  localStorage.removeItem(storageKey(userId))
  if (merged.length === remote.length) return remote
  return savePokedex(merged)
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
  const queryClient = useQueryClient()
  const queryKey = pokedexQueryKey(userId)
  const { data: cardIds = [], isSuccess } = useQuery({
    queryKey,
    queryFn: () => loadPokedex(userId),
    enabled: userId.length > 0
  })
  const owned = useMemo(() => new Set(cardIds), [cardIds])
  const ready = isSuccess
  const saveQueue = useRef(Promise.resolve())
  const [section, setSection] = useState<SectionFilter>('all')
  const [ownedFilter, setOwnedFilter] = useState<OwnedFilter>('all')
  const [type, setType] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Pokedex30Card | null>(null)
  const [shareAnchor, setShareAnchor] = useState<null | HTMLElement>(null)
  const [typeMenuAnchor, setTypeMenuAnchor] = useState<null | HTMLElement>(null)
  const [shareSnack, setShareSnack] = useState<string | null>(null)
  const [shareOwnedMode, setShareOwnedMode] =
    useState<Pokedex30ShareOwned>('missing')

  const closeShareMenus = () => {
    setShareAnchor(null)
    setTypeMenuAnchor(null)
  }

  const copyShare = async (scope: Pokedex30ShareScope) => {
    const text = buildPokedex30ShareMessage(owned, shareOwnedMode, scope)
    closeShareMenus()
    try {
      await navigator.clipboard.writeText(text)
      setShareSnack('Mensaje copiado. Ya lo puedes pegar en el chat.')
    } catch {
      setShareSnack('No se pudo copiar. Revisa los permisos del navegador.')
    }
  }

  const toggle = (id: string) => {
    if (!userId) return
    const current = queryClient.getQueryData<string[]>(queryKey) ?? cardIds
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    const ids = [...next]
    queryClient.setQueryData(queryKey, ids)
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => savePokedex(ids))
      .then(saved => {
        const shown = queryClient.getQueryData<string[]>(queryKey)
        if (shown?.join('\n') === ids.join('\n')) {
          queryClient.setQueryData(queryKey, saved)
        }
      })
      .catch(() => {
        const shown = queryClient.getQueryData<string[]>(queryKey)
        if (shown?.join('\n') === ids.join('\n')) {
          void queryClient.invalidateQueries({ queryKey })
        }
      })
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
            grande. El avance queda guardado en tu cuenta.
          </Typography>
        </Box>
        <Stack spacing={1} sx={{ minWidth: { md: 220 } }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {ownedCount} de {total} · {progress}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 99 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShareOutlined />}
            disabled={!ready}
            onClick={event => setShareAnchor(event.currentTarget)}
            sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' } }}
          >
            Compartir
          </Button>
        </Stack>
      </Stack>

      <Menu
        anchorEl={shareAnchor}
        open={Boolean(shareAnchor)}
        onClose={closeShareMenus}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ list: { sx: { minWidth: 280 } } }}
      >
        <Box
          sx={{ px: 2, py: 1.25 }}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
        >
          <Typography variant="caption" color="text.secondary">
            ¿Qué quieres compartir?
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 0.75 }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: shareOwnedMode === 'missing' ? 700 : 400,
                color:
                  shareOwnedMode === 'missing'
                    ? 'text.primary'
                    : 'text.secondary'
              }}
            >
              Me falta
            </Typography>
            <Switch
              size="small"
              checked={shareOwnedMode === 'owned'}
              onChange={(_, checked) =>
                setShareOwnedMode(checked ? 'owned' : 'missing')
              }
              inputProps={{ 'aria-label': 'Tengo o me falta' }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: shareOwnedMode === 'owned' ? 700 : 400,
                color:
                  shareOwnedMode === 'owned' ? 'text.primary' : 'text.secondary'
              }}
            >
              Tengo
            </Typography>
          </Stack>
        </Box>
        <Divider />
        <MenuItem onClick={() => void copyShare('all')}>
          <ListItemText
            primary="Set completo"
            secondary={
              shareOwnedMode === 'owned'
                ? 'Todas las cartas que tienes'
                : 'Todas las que aún te faltan'
            }
          />
        </MenuItem>
        <MenuItem onClick={() => void copyShare('pikachu')}>
          <ListItemText primary="Solo Pikachu" />
        </MenuItem>
        <MenuItem onClick={() => void copyShare('secret')}>
          <ListItemText primary="Solo secretas" />
        </MenuItem>
        <MenuItem onClick={() => void copyShare('classic')}>
          <ListItemText primary="Solo clásicas" />
        </MenuItem>
        <MenuItem onClick={() => void copyShare('mew-rgb')}>
          <ListItemText primary="Solo Mew RGB" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={event => setTypeMenuAnchor(event.currentTarget)}>
          <ListItemText primary="Por tipo" secondary="Planta, Fuego, Rayo…" />
          <ListItemIcon sx={{ minWidth: 28, justifyContent: 'flex-end' }}>
            <ChevronRight fontSize="small" />
          </ListItemIcon>
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={typeMenuAnchor}
        open={Boolean(typeMenuAnchor)}
        onClose={() => setTypeMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled sx={{ opacity: 1, typography: 'caption' }}>
          {shareOwnedMode === 'owned' ? 'Tipo · tengo' : 'Tipo · me faltan'}
        </MenuItem>
        {types.map(item => (
          <MenuItem key={item} onClick={() => void copyShare({ type: item })}>
            {typeLabel(item)}
          </MenuItem>
        ))}
      </Menu>

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

      <Snackbar
        open={Boolean(shareSnack)}
        autoHideDuration={3500}
        onClose={() => setShareSnack(null)}
        message={shareSnack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
