'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import PlayPokemonDecklistPdfDialog from '@/components/decklist/PlayPokemonDecklistPdfDialog'
import DecklistVariantsPanel from '@/components/decklist/DecklistVariantsPanel'
import type { DecklistVariantDTO } from '@/components/decklist/DecklistVariantsPanel'
import DecklistDeckMetaDialogs from '@/components/decklist/DecklistDeckMetaDialogs'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import {
  useDeleteSavedDecklist,
  usePatchDecklistPublic
} from '@/hooks/useSavedDecklists'

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
  /** Aparece en /dashboard/decklists/publicos para la comunidad. */
  isPublic: boolean
}

export default function DecklistDetailClient({
  initial
}: {
  initial: DecklistDetailInitial
}) {
  const theme = useTheme()
  const router = useRouter()
  const deleteDeck = useDeleteSavedDecklist()
  const patchPublic = usePatchDecklistPublic()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [editFullOpen, setEditFullOpen] = useState(false)
  const [editSpritesOpen, setEditSpritesOpen] = useState(false)

  const handleDeckMetaApplied = useCallback(() => {
    router.refresh()
  }, [router])

  const handleDelete = () => {
    deleteDeck.mutate(initial.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        router.push('/dashboard/decklists')
        router.refresh()
      }
    })
  }

  const handleEditDeckInBuilder = () => {
    router.push(`/dashboard/deck-builder?edit=${initial.id}`)
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
            Mis listas
          </Button>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(
                theme.palette.background.paper,
                theme.palette.mode === 'dark' ? 0.92 : 1
              ),
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 16px 40px -28px ${alpha('#000', 0.45)}`
                  : `0 14px 36px -28px ${alpha(theme.palette.primary.dark, 0.1)}`
            }}
          >
            <Stack spacing={2.25}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'center', sm: 'flex-start' }}
                justifyContent="space-between"
              >
                <Typography
                  component="h1"
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15,
                    textWrap: 'balance',
                    fontSize: { xs: '1.65rem', md: '2rem' },
                    flex: 1,
                    minWidth: 0,
                    alignSelf: { xs: 'stretch', sm: 'flex-start' },
                    textAlign: { xs: 'center', sm: 'left' }
                  }}
                >
                  {initial.name}
                </Typography>
                <Tooltip title="Editar sprites" placement="top">
                  <ButtonBase
                    focusRipple
                    aria-label="Editar sprites del mazo"
                    onClick={() => {
                      setEditFullOpen(false)
                      setEditSpritesOpen(true)
                    }}
                    sx={{
                      borderRadius: 2,
                      flexShrink: 0,
                      transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        boxShadow:
                          theme.palette.mode === 'dark'
                            ? `0 12px 32px -14px ${alpha('#000', 0.55)}`
                            : `0 14px 36px -18px ${alpha(theme.palette.primary.dark, 0.22)}`
                      },
                      '&:active': { transform: 'scale(0.98)' },
                      '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                      }
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: alpha(theme.palette.primary.main, 0.06)
                      }}
                    >
                      <DecklistSpritePair
                        slugs={initial.pokemonSlugs}
                        size={44}
                      />
                    </Box>
                  </ButtonBase>
                </Tooltip>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                flexWrap="wrap"
                useFlexGap
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                  sx={{
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.5
                  }}
                >
                  Actualizado {initial.updatedAtLabel}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={initial.isPublic}
                      size="small"
                      onChange={(_, checked) => {
                        patchPublic.mutate(
                          { id: initial.id, isPublic: checked },
                          { onSuccess: () => router.refresh() }
                        )
                      }}
                      disabled={patchPublic.isPending}
                      inputProps={{
                        'aria-label': 'Compartir en listas públicas'
                      }}
                    />
                  }
                  label={
                    <Typography
                      component="span"
                      variant="caption"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ letterSpacing: '0.02em' }}
                    >
                      Visible en listas públicas
                    </Typography>
                  }
                  sx={{
                    m: 0,
                    mr: 0,
                    ml: { xs: 0, sm: 'auto' },
                    alignItems: 'center',
                    gap: 0.75
                  }}
                />
              </Stack>

              <Divider
                sx={{
                  borderColor: alpha(theme.palette.divider, 0.85)
                }}
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))'
                  },
                  gap: 1.5,
                  width: '100%'
                }}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  size="medium"
                  fullWidth
                  startIcon={<SettingsOutlinedIcon />}
                  onClick={() => {
                    setEditSpritesOpen(false)
                    setEditFullOpen(true)
                  }}
                  sx={{
                    py: 1.15,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    transition:
                      'transform 0.18s ease, border-color 0.2s ease, background-color 0.2s ease',
                    '&:active': { transform: 'translateY(1px) scale(0.995)' }
                  }}
                >
                  Configuración
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="medium"
                  fullWidth
                  startIcon={<EditOutlinedIcon />}
                  onClick={handleEditDeckInBuilder}
                  sx={{
                    py: 1.15,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    transition:
                      'transform 0.18s ease, border-color 0.2s ease, background-color 0.2s ease',
                    '&:active': { transform: 'translateY(1px) scale(0.995)' }
                  }}
                >
                  Editar mazo
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="medium"
                  fullWidth
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => setPdfOpen(true)}
                  sx={{
                    py: 1.15,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    transition:
                      'transform 0.18s ease, background-color 0.2s ease',
                    '&:active': { transform: 'translateY(1px) scale(0.995)' }
                  }}
                >
                  Generar PDF
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="medium"
                  fullWidth
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDeleteOpen(true)}
                  disabled={deleteDeck.isPending}
                  sx={{
                    py: 1.15,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: 2,
                    transition:
                      'transform 0.18s ease, background-color 0.2s ease',
                    '&:active': { transform: 'translateY(1px) scale(0.995)' }
                  }}
                >
                  Eliminar mazo
                </Button>
              </Box>
            </Stack>
          </Paper>

          <DecklistVariantsPanel
            decklistId={initial.id}
            baseDeckText={initial.deckText}
            principalVariantId={initial.principalVariantId}
            variants={initial.variants}
          />
        </Stack>
      </Container>

      <PlayPokemonDecklistPdfDialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        decklistId={initial.id}
        decklistName={initial.name}
        principalVariantId={initial.principalVariantId}
        variants={initial.variants}
      />

      <DecklistDeckMetaDialogs
        decklistId={initial.id}
        draftName={initial.name}
        draftSlugs={initial.pokemonSlugs}
        fullOpen={editFullOpen}
        spritesOpen={editSpritesOpen}
        onCloseFull={() => setEditFullOpen(false)}
        onCloseSprites={() => setEditSpritesOpen(false)}
        onApplied={handleDeckMetaApplied}
      />

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
