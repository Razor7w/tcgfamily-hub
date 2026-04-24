'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import LayersIcon from '@mui/icons-material/Layers'
import PublicIcon from '@mui/icons-material/Public'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import {
  useDeleteSavedDecklist,
  usePatchDecklistPublic,
  useSavedDecklistsList,
  type SavedDecklistSummary
} from '@/hooks/useSavedDecklists'
import {
  matchesDecklistDateFilter,
  type DecklistDateFilter
} from '@/lib/decklist-list-utils'

const DECKLIST_LIST_PAGE_SIZE = 10

export default function DecklistsPage() {
  const theme = useTheme()
  const { data: decklists, isPending, error } = useSavedDecklistsList()
  const deleteDeck = useDeleteSavedDecklist()
  const patchPublic = usePatchDecklistPublic()
  const [deleteTarget, setDeleteTarget] = useState<SavedDecklistSummary | null>(
    null
  )
  const [nameQuery, setNameQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DecklistDateFilter>('all')
  const [page, setPage] = useState(1)

  const filteredDecklists = useMemo(() => {
    if (!decklists?.length) return []
    const q = nameQuery.trim().toLowerCase()
    let next = decklists
    if (q) next = next.filter(d => d.name.toLowerCase().includes(q))
    if (dateFilter !== 'all') {
      next = next.filter(d =>
        matchesDecklistDateFilter(d.updatedAt, dateFilter)
      )
    }
    return next
  }, [decklists, nameQuery, dateFilter])

  const pageCount = Math.max(
    1,
    Math.ceil(filteredDecklists.length / DECKLIST_LIST_PAGE_SIZE)
  )
  const pageClamped = Math.min(page, pageCount)

  const paginatedDecklists = useMemo(() => {
    const start = (pageClamped - 1) * DECKLIST_LIST_PAGE_SIZE
    return filteredDecklists.slice(start, start + DECKLIST_LIST_PAGE_SIZE)
  }, [filteredDecklists, pageClamped])

  return (
    <Box
      component="main"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100%',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: theme.palette.mode === 'dark' ? 0.04 : 0.06,
          backgroundImage: `radial-gradient(circle at 14% 16%, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 42%)`
        }
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          py: { xs: 3, sm: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            gap={2}
          >
            <Stack spacing={0.75}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  color: 'primary.main'
                }}
              >
                Herramientas
              </Typography>
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  textWrap: 'balance'
                }}
              >
                Decklists guardados
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: '62ch', fontWeight: 500 }}
              >
                Crea un mazo con dos Pokémon representativos, un nombre y el
                texto del listado. Luego verás la vista previa y la parrilla de
                cartas.
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, flexShrink: 0 }}
            >
              <Button
                component={Link}
                href="/dashboard/decklists/publicos"
                variant="outlined"
                color="primary"
                startIcon={<PublicIcon />}
                sx={{ fontWeight: 600, py: 1.15, px: 2 }}
              >
                Decklists públicos
              </Button>
              <Button
                component={Link}
                href="/dashboard/decklists/nuevo"
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{
                  fontWeight: 700,
                  py: 1.25,
                  px: 2
                }}
              >
                Nuevo decklist
              </Button>
            </Stack>
          </Stack>

          {error ? (
            <Alert severity="error">
              {error instanceof Error ? error.message : 'Error al cargar'}
            </Alert>
          ) : null}

          {isPending ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress size={36} />
            </Stack>
          ) : !decklists?.length ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Aún no tienes decklists guardados.
              </Typography>
              <Button
                component={Link}
                href="/dashboard/decklists/nuevo"
                variant="outlined"
                startIcon={<AddIcon />}
              >
                Crear el primero
              </Button>
            </Paper>
          ) : (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                flexWrap="wrap"
                useFlexGap
              >
                <TextField
                  size="small"
                  fullWidth
                  value={nameQuery}
                  onChange={e => {
                    setNameQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Buscar por nombre del mazo…"
                  aria-label="Buscar decklist por nombre"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" aria-hidden />
                      </InputAdornment>
                    )
                  }}
                  sx={{ flex: { sm: '1 1 280px' }, maxWidth: { sm: 420 } }}
                />
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={dateFilter}
                  onChange={(_, v: DecklistDateFilter | null) => {
                    if (v != null) {
                      setDateFilter(v)
                      setPage(1)
                    }
                  }}
                  aria-label="Filtrar por fecha de actualización"
                  sx={{ flexShrink: 0 }}
                >
                  <ToggleButton value="all">Todos</ToggleButton>
                  <ToggleButton value="week">Esta semana</ToggleButton>
                  <ToggleButton value="month">Este mes</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              {!filteredDecklists.length ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  <Typography color="text.secondary">
                    No hay mazos que coincidan con los filtros. Probá otro
                    nombre o cambiá el período (fecha según última
                    actualización).
                  </Typography>
                </Paper>
              ) : (
                <>
                  <Paper
                    elevation={0}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}
                  >
                    <List disablePadding>
                      {paginatedDecklists.map(row => {
                        const sub = new Date(row.updatedAt).toLocaleString(
                          'es-CL',
                          {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          }
                        )
                        return (
                          <ListItem
                            key={row.id}
                            divider
                            secondaryAction={
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                              >
                                <Tooltip
                                  title={
                                    row.isPublic
                                      ? 'Quitar de decklists públicos'
                                      : 'Compartir en decklists públicos'
                                  }
                                >
                                  <IconButton
                                    edge="end"
                                    aria-label={
                                      row.isPublic
                                        ? 'Quitar de decklists públicos'
                                        : 'Compartir en decklists públicos'
                                    }
                                    onClick={e => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      patchPublic.mutate({
                                        id: row.id,
                                        isPublic: !row.isPublic
                                      })
                                    }}
                                    disabled={patchPublic.isPending}
                                    color={row.isPublic ? 'primary' : 'default'}
                                  >
                                    <PublicIcon />
                                  </IconButton>
                                </Tooltip>
                                <IconButton
                                  edge="end"
                                  aria-label={`Eliminar mazo ${row.name}`}
                                  onClick={e => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setDeleteTarget(row)
                                  }}
                                >
                                  <DeleteOutlineIcon />
                                </IconButton>
                              </Stack>
                            }
                            disablePadding
                          >
                            <ListItemButton
                              component={Link}
                              href={`/dashboard/decklists/${row.id}`}
                              sx={{
                                py: 1.75,
                                alignItems: 'center',
                                gap: 2,
                                pr: 12
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 0 }}>
                                <DecklistSpritePair
                                  slugs={row.pokemonSlugs}
                                  size={36}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={row.name}
                                secondary={`Actualizado ${sub}`}
                                primaryTypographyProps={{
                                  fontWeight: 700,
                                  noWrap: true
                                }}
                                secondaryTypographyProps={{
                                  variant: 'caption'
                                }}
                              />
                              <LayersIcon
                                sx={{ color: 'text.disabled', flexShrink: 0 }}
                                fontSize="small"
                              />
                            </ListItemButton>
                          </ListItem>
                        )
                      })}
                    </List>
                  </Paper>
                  {pageCount > 1 ? (
                    <Stack alignItems="center" sx={{ pt: 0.5 }}>
                      <Pagination
                        count={pageCount}
                        page={pageClamped}
                        onChange={(_, p) => setPage(p)}
                        color="primary"
                        size="small"
                        showFirstButton
                        showLastButton
                      />
                    </Stack>
                  ) : null}
                </>
              )}
            </Stack>
          )}
        </Stack>
      </Container>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteDeck.isPending && setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar este mazo?</DialogTitle>
        <DialogContent>
          {deleteDeck.isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteDeck.error instanceof Error
                ? deleteDeck.error.message
                : 'No se pudo eliminar'}
            </Alert>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            Se borrará «{deleteTarget?.name}» y todas sus variantes. Esta acción
            no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteDeck.isPending}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteDeck.isPending || !deleteTarget}
            onClick={() => {
              if (!deleteTarget) return
              deleteDeck.mutate(deleteTarget.id, {
                onSuccess: () => setDeleteTarget(null)
              })
            }}
            sx={{ fontWeight: 700 }}
          >
            {deleteDeck.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
