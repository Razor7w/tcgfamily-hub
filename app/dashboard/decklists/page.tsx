'use client'

import { useState } from 'react'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import LayersIcon from '@mui/icons-material/Layers'
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
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import {
  useDeleteSavedDecklist,
  useSavedDecklistsList,
  type SavedDecklistSummary
} from '@/hooks/useSavedDecklists'

export default function DecklistsPage() {
  const theme = useTheme()
  const { data: decklists, isPending, error } = useSavedDecklistsList()
  const deleteDeck = useDeleteSavedDecklist()
  const [deleteTarget, setDeleteTarget] = useState<SavedDecklistSummary | null>(
    null
  )

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
            <Button
              component={Link}
              href="/dashboard/decklists/nuevo"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'center' },
                fontWeight: 700,
                py: 1.25,
                px: 2,
                flexShrink: 0
              }}
            >
              Nuevo decklist
            </Button>
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
                {decklists.map(row => {
                  const sub = new Date(row.updatedAt).toLocaleString('es-CL', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })
                  return (
                    <ListItem
                      key={row.id}
                      divider
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label={`Eliminar mazo ${row.name}`}
                          onClick={() => setDeleteTarget(row)}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      }
                      disablePadding
                    >
                      <ListItemButton
                        component={Link}
                        href={`/dashboard/decklists/${row.id}`}
                        sx={{ py: 1.75, alignItems: 'center', gap: 2, pr: 6 }}
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
                          secondaryTypographyProps={{ variant: 'caption' }}
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
          )}

          <Typography variant="body2" color="text.secondary">
            ¿Solo quieres probar el formato?{' '}
            <Link href="/dashboard/decklist-demo" style={{ fontWeight: 600 }}>
              Abrir demo sin guardar
            </Link>
            .
          </Typography>
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
