'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import DecklistVariantsPanel from '@/components/decklist/DecklistVariantsPanel'
import type { DecklistVariantDTO } from '@/components/decklist/DecklistVariantsPanel'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import { useDeleteSavedDecklist } from '@/hooks/useSavedDecklists'

export type DecklistDetailInitial = {
  id: string
  name: string
  deckText: string
  pokemonSlugs: string[]
  variants: DecklistVariantDTO[]
  /** Si no es null, la pestaña Principal muestra el texto de esa variante. */
  principalVariantId: string | null
  updatedAt: string
  /** Texto ya formateado en el servidor (evita mismatch de hidratación). */
  updatedAtLabel: string
}

export default function DecklistDetailClient({
  initial
}: {
  initial: DecklistDetailInitial
}) {
  const theme = useTheme()
  const router = useRouter()
  const deleteDeck = useDeleteSavedDecklist()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDelete = () => {
    deleteDeck.mutate(initial.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        router.push('/dashboard/decklists')
        router.refresh()
      }
    })
  }

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
          backgroundImage: `radial-gradient(circle at 10% 12%, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 40%), radial-gradient(circle at 90% 6%, ${alpha(theme.palette.primary.light, 0.1)} 0%, transparent 36%)`
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
          <Button
            component={Link}
            href="/dashboard/decklists"
            startIcon={<ArrowBackIcon />}
            variant="text"
            color="inherit"
            sx={{
              alignSelf: 'flex-start',
              px: 1,
              minWidth: 0,
              color: 'text.secondary',
              fontWeight: 600,
              '&:hover': {
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.06)
              }
            }}
          >
            Mis decklists
          </Button>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            gap={2}
          >
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  textWrap: 'balance'
                }}
              >
                {initial.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
              >
                Actualizado {initial.updatedAtLabel}
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  alignSelf: { xs: 'center', sm: 'center' }
                }}
              >
                <DecklistSpritePair slugs={initial.pokemonSlugs} size={44} />
              </Box>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setDeleteOpen(true)}
                disabled={deleteDeck.isPending}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  alignSelf: { xs: 'stretch', sm: 'center' }
                }}
              >
                Eliminar mazo
              </Button>
            </Stack>
          </Stack>

          <DecklistVariantsPanel
            decklistId={initial.id}
            baseDeckText={initial.deckText}
            principalVariantId={initial.principalVariantId}
            variants={initial.variants}
          />
        </Stack>
      </Container>

      <Dialog
        open={deleteOpen}
        onClose={() => !deleteDeck.isPending && setDeleteOpen(false)}
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
            Se borrará «{initial.name}» y todas sus variantes. Esta acción no se
            puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={deleteDeck.isPending}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleteDeck.isPending}
            sx={{ fontWeight: 700 }}
          >
            {deleteDeck.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
