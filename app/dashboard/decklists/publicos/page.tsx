'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PublicIcon from '@mui/icons-material/Public'
import SearchIcon from '@mui/icons-material/Search'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import { usePublicDecklistsList } from '@/hooks/useSavedDecklists'
import {
  matchesDecklistDateFilter,
  type DecklistDateFilter
} from '@/lib/decklist-list-utils'

const PUBLIC_DECKLIST_LIST_PAGE_SIZE = 10

export default function PublicDecklistsPage() {
  const theme = useTheme()
  const { data: decklists, isPending, error } = usePublicDecklistsList()
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
    Math.ceil(filteredDecklists.length / PUBLIC_DECKLIST_LIST_PAGE_SIZE)
  )
  const pageClamped = Math.min(page, pageCount)

  const paginatedDecklists = useMemo(() => {
    const start = (pageClamped - 1) * PUBLIC_DECKLIST_LIST_PAGE_SIZE
    return filteredDecklists.slice(
      start,
      start + PUBLIC_DECKLIST_LIST_PAGE_SIZE
    )
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
          backgroundImage: `radial-gradient(circle at 14% 16%, ${alpha(theme.palette.secondary.main, 0.14)} 0%, transparent 42%)`
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
          <Stack spacing={0.75}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: '0.12em',
                fontWeight: 700,
                color: 'primary.main'
              }}
            >
              Comunidad
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
              Listas públicas
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: '62ch', fontWeight: 500 }}
            >
              Mazos que otros jugadores comparten.
            </Typography>
            <Typography variant="body2">
              <Link
                href="/dashboard/decklists"
                style={{
                  fontWeight: 600,
                  color: theme.palette.primary.main
                }}
              >
                Volver a mis listas
              </Link>
            </Typography>
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
              <Typography color="text.secondary">
                Nadie ha compartido un mazo todavía. Marca el tuyo como público
                desde «Mis listas».
              </Typography>
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
                  aria-label="Buscar decklist público por nombre"
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
                    No hay mazos públicos que coincidan con los filtros. Probá
                    otro nombre o cambiá el período (fecha según última
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
                        const sub = new Date(row.updatedAt).toLocaleDateString(
                          'es-CL',
                          {
                            dateStyle: 'medium'
                          }
                        )
                        const ownerInitial =
                          row.ownerName.trim().charAt(0).toUpperCase() || '?'
                        return (
                          <ListItem key={row.id} divider disablePadding>
                            <ListItemButton
                              component={Link}
                              href={`/dashboard/decklists/publicos/${row.id}`}
                              sx={{
                                py: 1.75,
                                alignItems: 'center',
                                gap: 2,
                                pr: 2
                              }}
                            >
                              <Avatar
                                src={row.ownerImage ?? undefined}
                                alt=""
                                sx={{
                                  width: 44,
                                  height: 44,
                                  flexShrink: 0
                                }}
                              >
                                {ownerInitial}
                              </Avatar>
                              <ListItemIcon sx={{ minWidth: 0 }}>
                                <DecklistSpritePair
                                  slugs={row.pokemonSlugs}
                                  size={36}
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={row.name}
                                secondary={`${row.ownerName} · ${sub}`}
                                primaryTypographyProps={{
                                  fontWeight: 700,
                                  noWrap: true
                                }}
                                secondaryTypographyProps={{
                                  variant: 'caption',
                                  noWrap: true
                                }}
                              />
                              <PublicIcon
                                sx={{ color: 'primary.main', flexShrink: 0 }}
                                fontSize="small"
                                aria-hidden
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
    </Box>
  )
}
