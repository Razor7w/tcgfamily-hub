'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import PlayPokemonDecklistPdfDialog from '@/components/decklist/PlayPokemonDecklistPdfDialog'
import DecklistVariantsPanel from '@/components/decklist/DecklistVariantsPanel'
import type { DecklistVariantDTO } from '@/components/decklist/DecklistVariantsPanel'
import DecklistDeckMetaDialogs from '@/components/decklist/DecklistDeckMetaDialogs'
import DecklistImageDialog from '@/components/decklist/DecklistImageDialog'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import { flatCardsFromDecklistText } from '@/lib/decklist'
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

function initialPrincipalDeckText(i: DecklistDetailInitial): string {
  if (!i.principalVariantId) return i.deckText
  const v = i.variants.find(x => x.id === i.principalVariantId)
  return v?.deckText ?? i.deckText
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
  const [pdfOpen, setPdfOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [editFullOpen, setEditFullOpen] = useState(false)
  const [editSpritesOpen, setEditSpritesOpen] = useState(false)
  const [liveDeck, setLiveDeck] = useState({
    text: initialPrincipalDeckText(initial),
    summary: 'Principal' as string
  })

  const handleActiveDeckChange = useCallback(
    (payload: { text: string; summary: string }) => {
      setLiveDeck(payload)
    },
    []
  )

  const handleDeckMetaApplied = useCallback(() => {
    router.refresh()
  }, [router])

  const imageCards = useMemo(
    () => flatCardsFromDecklistText(liveDeck.text),
    [liveDeck.text]
  )

  const imageDialogTitle = useMemo(
    () => `${initial.name} · ${liveDeck.summary}`,
    [initial.name, liveDeck.summary]
  )

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

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'flex-start' },
              justifyContent: 'space-between',
              gap: { xs: 2.25, md: 3 }
            }}
          >
            <Stack spacing={1} sx={{ minWidth: 0, flex: { md: '1 1 0%' } }}>
              <Typography
                component="h1"
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  textWrap: 'balance',
                  fontSize: { xs: '1.65rem', md: '2rem' }
                }}
              >
                {initial.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                Actualizado {initial.updatedAtLabel}
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'center', md: 'flex-end' },
                gap: 1.5,
                width: { xs: '100%', md: 'auto' },
                maxWidth: { xs: 560, md: 'none' },
                mx: { xs: 'auto', md: 0 },
                flexShrink: 0
              }}
            >
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
                    display: 'block',
                    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? `0 12px 32px -14px ${alpha('#000', 0.55)}`
                          : `0 14px 36px -18px ${alpha(theme.palette.primary.dark, 0.22)}`
                    },
                    '&:active': { transform: 'scale(0.98)' }
                  }}
                >
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? `0 10px 28px -18px ${alpha('#000', 0.4)}`
                          : `0 12px 28px -20px ${alpha(theme.palette.primary.dark, 0.12)}`
                    }}
                  >
                    <DecklistSpritePair
                      slugs={initial.pokemonSlugs}
                      size={44}
                    />
                  </Box>
                </ButtonBase>
              </Tooltip>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  flexWrap: { md: 'wrap' },
                  alignItems: { xs: 'stretch', md: 'center' },
                  justifyContent: { md: 'flex-end' },
                  gap: 1.5,
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  startIcon={<ImageOutlinedIcon />}
                  onClick={() => setImageOpen(true)}
                  disabled={imageCards.length === 0}
                  sx={{
                    width: { xs: '100%', md: 'auto' },
                    px: { md: 2.25 },
                    py: 1.35,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                    '&:active': { transform: 'translateY(1px) scale(0.99)' },
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? `0 10px 28px ${alpha(theme.palette.primary.main, 0.28)}`
                        : `0 10px 26px ${alpha(theme.palette.primary.dark, 0.2)}`,
                    '&:hover': {
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? `0 14px 32px ${alpha(theme.palette.primary.main, 0.34)}`
                          : `0 14px 30px ${alpha(theme.palette.primary.dark, 0.24)}`
                    }
                  }}
                >
                  Ver como imagen
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="medium"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => {
                    setEditSpritesOpen(false)
                    setEditFullOpen(true)
                  }}
                  sx={{
                    width: { xs: '100%', md: 'auto' },
                    fontWeight: 600,
                    textTransform: 'none',
                    py: 1.1,
                    borderRadius: 2,
                    borderColor: 'divider',
                    transition:
                      'transform 0.15s ease, background-color 0.2s ease',
                    '&:active': { transform: 'translateY(1px) scale(0.99)' },
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.06)
                    }
                  }}
                >
                  Editar mazo
                </Button>
                <Box
                  sx={{
                    display: { xs: 'grid', md: 'contents' },
                    gridTemplateColumns: { xs: '1fr 1fr' },
                    gap: 1.5,
                    width: { xs: '100%', md: 'auto' }
                  }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    size="medium"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => setPdfOpen(true)}
                    sx={{
                      width: { xs: '100%', md: 'auto' },
                      fontWeight: 600,
                      textTransform: 'none',
                      py: 1.1,
                      borderRadius: 2,
                      transition:
                        'transform 0.15s ease, background-color 0.2s ease',
                      '&:active': { transform: 'translateY(1px) scale(0.99)' }
                    }}
                  >
                    Generar PDF
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="medium"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setDeleteOpen(true)}
                    disabled={deleteDeck.isPending}
                    sx={{
                      width: { xs: '100%', md: 'auto' },
                      fontWeight: 600,
                      textTransform: 'none',
                      py: 1.1,
                      borderRadius: 2,
                      transition:
                        'transform 0.15s ease, background-color 0.2s ease',
                      '&:active': { transform: 'translateY(1px) scale(0.99)' }
                    }}
                  >
                    Eliminar mazo
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>

          <DecklistVariantsPanel
            decklistId={initial.id}
            baseDeckText={initial.deckText}
            principalVariantId={initial.principalVariantId}
            variants={initial.variants}
            onActiveDeckChange={handleActiveDeckChange}
            hideDecklistImageButton
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

      <DecklistImageDialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        cards={imageCards}
        title={imageDialogTitle}
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
