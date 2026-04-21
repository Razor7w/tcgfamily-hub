'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha, useTheme } from '@mui/material/styles'
import DecklistPokemonSlotPickers from '@/components/decklist/DecklistPokemonSlotPickers'
import type { PokemonSpeciesOption } from '@/hooks/usePokemonSpeciesOptions'
import { useCreateSavedDecklist } from '@/hooks/useSavedDecklists'
import {
  SAVED_DECKLIST_NAME_MAX,
  SAVED_DECKLIST_TEXT_MAX
} from '@/lib/saved-decklist-validation'

function deckNameFromSlots(
  s1: PokemonSpeciesOption | null,
  s2: PokemonSpeciesOption | null
): string {
  if (s1 && s2) return `${s1.label} / ${s2.label}`
  if (s1) return s1.label
  return ''
}

export default function NuevoDecklistPage() {
  const theme = useTheme()
  const router = useRouter()
  const createDeck = useCreateSavedDecklist()

  /** `null` = usar nombre automático desde sprites; string = texto del usuario */
  const [nameManual, setNameManual] = useState<string | null>(null)
  const [deckText, setDeckText] = useState('')
  const [slot1, setSlot1] = useState<PokemonSpeciesOption | null>(null)
  const [slot2, setSlot2] = useState<PokemonSpeciesOption | null>(null)

  const autoName = deckNameFromSlots(slot1, slot2)
  const nameFieldValue =
    nameManual !== null && nameManual.trim() !== '' ? nameManual : autoName
  const resolvedName =
    nameManual !== null && nameManual.trim() !== ''
      ? nameManual.trim()
      : autoName

  const handleSlot1Change = (v: PokemonSpeciesOption | null) => {
    setSlot1(v)
    if (!v) {
      setSlot2(null)
      return
    }
    setSlot2(prev => (prev && prev.slug === v.slug ? null : prev))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slot1?.slug) return
    const pokemon = slot2?.slug ? [slot1.slug, slot2.slug] : [slot1.slug]
    createDeck.mutate(
      {
        name: resolvedName,
        deckText: deckText.trim(),
        pokemon
      },
      {
        onSuccess: data => {
          router.push(`/dashboard/decklists/${data.id}`)
          router.refresh()
        }
      }
    )
  }

  const canSubmit =
    resolvedName.length > 0 &&
    deckText.trim().length > 0 &&
    Boolean(slot1?.slug) &&
    !createDeck.isPending

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
          opacity: theme.palette.mode === 'dark' ? 0.055 : 0.08,
          backgroundImage: `radial-gradient(ellipse 120% 80% at 0% 0%, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 55%), radial-gradient(ellipse 90% 70% at 100% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%), radial-gradient(circle at 50% 100%, ${alpha(theme.palette.primary.dark, 0.06)} 0%, transparent 42%)`
        }
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          position: 'relative',
          py: { xs: 3, sm: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
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

          <Stack spacing={1}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: '0.12em',
                fontWeight: 700,
                color: 'primary.main'
              }}
            >
              Nuevo
            </Typography>
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}
            >
              Crear decklist
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={500}
              sx={{ maxWidth: '62ch', lineHeight: 1.65, textWrap: 'pretty' }}
            >
              Elige al menos un Pokémon para el sprite (el segundo es opcional),
              pon nombre al mazo y pega el texto. Después de guardar verás la
              lista y el botón para la vista en imágenes.
            </Typography>
          </Stack>

          <Stack spacing={2.25}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderLeft: '4px solid',
                borderLeftColor: 'primary.main',
                bgcolor: 'background.paper',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 14px 36px -22px ${alpha('#000', 0.5)}`
                    : `0 12px 32px -24px ${alpha(theme.palette.primary.dark, 0.14)}`
              }}
            >
              <Stack spacing={1.75}>
                <Stack spacing={0.35}>
                  <Typography
                    variant="overline"
                    sx={{
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: 'primary.main'
                    }}
                  >
                    Identidad
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                  >
                    Sprites del mazo
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    Obligatorio el primero; el segundo es opcional. Mismos
                    sprites que en torneos.
                  </Typography>
                </Stack>
                <DecklistPokemonSlotPickers
                  slot1={slot1}
                  slot2={slot2}
                  onSlot1Change={handleSlot1Change}
                  onSlot2Change={setSlot2}
                  disabled={createDeck.isPending}
                />
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderLeft: '4px solid',
                borderLeftColor: 'secondary.main',
                bgcolor: 'background.paper',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 12px 32px -22px ${alpha('#000', 0.45)}`
                    : `0 10px 28px -22px ${alpha(theme.palette.secondary.dark, 0.12)}`
              }}
            >
              <Stack spacing={1.25}>
                <Stack spacing={0.35}>
                  <Typography
                    variant="overline"
                    sx={{
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: 'text.secondary'
                    }}
                  >
                    Nombre
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                  >
                    Cómo quieres llamar al mazo
                  </Typography>
                </Stack>
                <TextField
                  label="Nombre del deck"
                  value={nameFieldValue}
                  onChange={e => {
                    const v = e.target.value
                    if (!v.trim()) {
                      setNameManual(null)
                    } else {
                      setNameManual(v)
                    }
                  }}
                  required
                  fullWidth
                  inputProps={{ maxLength: SAVED_DECKLIST_NAME_MAX }}
                  helperText={`${nameFieldValue.length}/${SAVED_DECKLIST_NAME_MAX}`}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.common.white, 0.04)
                          : alpha(theme.palette.secondary.main, 0.04),
                      transition:
                        'box-shadow 0.2s ease, background-color 0.2s ease',
                      '&:hover': {
                        bgcolor:
                          theme.palette.mode === 'dark'
                            ? alpha(theme.palette.common.white, 0.06)
                            : alpha(theme.palette.secondary.main, 0.06)
                      },
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.secondary.main, 0.22)}`
                      }
                    }
                  }}
                />
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 12px 36px -20px ${alpha('#000', 0.48)}`
                    : `0 10px 30px -22px ${alpha(theme.palette.grey[700], 0.1)}`
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)} 0%, ${alpha(theme.palette.common.white, 0)} 65%)`
                }}
              >
                <Stack spacing={0.25}>
                  <Typography
                    variant="overline"
                    sx={{
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: 'primary.main'
                    }}
                  >
                    Listado
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                  >
                    Texto del decklist
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    Pega el bloque completo (Pokémon, Trainer, Energy…)
                  </Typography>
                </Stack>
              </Box>
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  bgcolor:
                    theme.palette.mode === 'dark'
                      ? alpha(theme.palette.common.black, 0.35)
                      : alpha(theme.palette.grey[100], 0.9),
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <TextField
                  label="Contenido"
                  value={deckText}
                  onChange={e => setDeckText(e.target.value)}
                  required
                  multiline
                  minRows={12}
                  maxRows={24}
                  fullWidth
                  variant="outlined"
                  inputProps={{ maxLength: SAVED_DECKLIST_TEXT_MAX }}
                  helperText={`${deckText.length}/${SAVED_DECKLIST_TEXT_MAX} caracteres`}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.25,
                      bgcolor: 'background.paper',
                      '&:hover fieldset': {
                        borderColor: alpha(theme.palette.primary.main, 0.45)
                      },
                      '&.Mui-focused fieldset': {
                        borderWidth: 1
                      }
                    },
                    '& .MuiInputBase-input': {
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8125rem',
                      lineHeight: 1.65,
                      fontVariantNumeric: 'tabular-nums'
                    }
                  }}
                />
              </Box>
            </Paper>

            {createDeck.isError ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {createDeck.error instanceof Error
                  ? createDeck.error.message
                  : 'No se pudo guardar'}
              </Alert>
            ) : null}

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.75, sm: 2 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === 'dark' ? 0.05 : 0.035
                )
              }}
            >
              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={1}
                justifyContent="flex-end"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  component={Link}
                  href="/dashboard/decklists"
                  color="inherit"
                  disabled={createDeck.isPending}
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.text.primary, 0.06)
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!canSubmit}
                  sx={{
                    fontWeight: 700,
                    minWidth: { xs: '100%', sm: 160 },
                    py: 1.1,
                    borderRadius: 1.5,
                    boxShadow:
                      theme.palette.mode === 'dark'
                        ? `0 8px 22px ${alpha(theme.palette.primary.main, 0.28)}`
                        : `0 8px 20px ${alpha(theme.palette.primary.dark, 0.2)}`,
                    '&:hover': {
                      boxShadow:
                        theme.palette.mode === 'dark'
                          ? `0 10px 26px ${alpha(theme.palette.primary.main, 0.34)}`
                          : `0 10px 24px ${alpha(theme.palette.primary.dark, 0.26)}`
                    }
                  }}
                >
                  {createDeck.isPending ? 'Guardando…' : 'Guardar y ver'}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
