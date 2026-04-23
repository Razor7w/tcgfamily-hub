'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import {
  useSavedDecklistsList,
  type SavedDecklistSummary
} from '@/hooks/useSavedDecklists'
import type { AgeDivisionChoice } from '@/components/decklist/PlayPokemonDecklistPdfDialog'

const PREFS_KEY_PREFIX = 'tcgfamily:playPokemonInlinePdf:v1:'

type DecklistDetail = {
  id: string
  name: string
  deckText: string
  variants: { id: string; label: string; deckText: string }[]
  principalVariantId: string | null
}

type MeResponse = { name: string; popid: string }

type ListOrigin = 'base' | string

function listOriginKey(d: DecklistDetail): ListOrigin {
  if (d.principalVariantId) {
    const ok = d.variants.some(v => v.id === d.principalVariantId)
    if (ok) return d.principalVariantId
  }
  return 'base'
}

function deckTextForOrigin(d: DecklistDetail, origin: ListOrigin): string {
  if (origin === 'base') return d.deckText
  const v = d.variants.find(x => x.id === origin)
  return v?.deckText ?? d.deckText
}

function readPrefsForDeck(
  deckId: string
): { playerName: string; playerId: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFS_KEY_PREFIX + deckId)
    if (!raw) return null
    const j = JSON.parse(raw) as {
      playerName?: unknown
      playerId?: unknown
    }
    const playerName = typeof j.playerName === 'string' ? j.playerName : ''
    const playerId = typeof j.playerId === 'string' ? j.playerId : ''
    return { playerName, playerId }
  } catch {
    return null
  }
}

function writePrefsForDeck(
  deckId: string,
  playerName: string,
  playerId: string
) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      PREFS_KEY_PREFIX + deckId,
      JSON.stringify({ playerName, playerId })
    )
  } catch {
    /* ignore */
  }
}

function sectionLabel(text: string) {
  return (
    <Typography
      variant="overline"
      component="p"
      sx={{
        letterSpacing: '0.1em',
        fontWeight: 700,
        color: 'primary.main',
        m: 0
      }}
    >
      {text}
    </Typography>
  )
}

export default function PlayPokemonDecklistPdfPageClient() {
  const theme = useTheme()
  const { data: decklistSummaries = [], isLoading: listLoading } =
    useSavedDecklistsList()

  const { data: me, isSuccess: meReady } = useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<MeResponse> => {
      const res = await fetch('/api/me')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(
          typeof j.error === 'string' ? j.error : 'Error al cargar perfil'
        )
      }
      return res.json() as Promise<MeResponse>
    }
  })

  const [source, setSource] = useState<'manual' | 'saved'>('manual')
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')
  const [listOrigin, setListOrigin] = useState<ListOrigin>('base')
  const [loadedDeck, setLoadedDeck] = useState<DecklistDetail | null>(null)
  const [deckText, setDeckText] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [ageDivision, setAgeDivision] = useState<AgeDivisionChoice>('masters')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!meReady || !me) return
    if (source === 'manual' && !playerName.trim() && me.name) {
      setPlayerName(me.name)
    }
    if (source === 'manual' && !playerId.trim() && me.popid) {
      setPlayerId(me.popid)
    }
  }, [meReady, me, source, playerName, playerId])

  const handleSelectDeck = async (id: string) => {
    setSelectedDeckId(id)
    setError(null)
    if (!id) {
      setLoadedDeck(null)
      setListOrigin('base')
      if (me?.name) setPlayerName(me.name)
      setPlayerId(me?.popid ?? '')
      return
    }
    try {
      const res = await fetch(`/api/decklists/${encodeURIComponent(id)}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(
          typeof j.error === 'string' ? j.error : 'No se pudo cargar el mazo'
        )
      }
      const d = (await res.json()) as DecklistDetail
      setLoadedDeck(d)
      const origin = listOriginKey(d)
      setListOrigin(origin)
      setDeckText(deckTextForOrigin(d, origin))
      const prefs = readPrefsForDeck(d.id)
      if (prefs) {
        setPlayerName(prefs.playerName)
        setPlayerId(prefs.playerId)
      } else {
        if (me?.name) setPlayerName(me.name)
        setPlayerId(me?.popid ?? '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el mazo')
    }
  }

  const canSubmit =
    playerName.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
    deckText.trim().length > 0

  const handleGenerate = async () => {
    setError(null)
    setPending(true)
    try {
      const res = await fetch('/api/play-pokemon-decklist-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckText: deckText.trim(),
          playerName: playerName.trim(),
          playerId: playerId.trim(),
          dateOfBirth,
          ageDivision
        })
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al generar PDF'
        )
      }
      if (source === 'saved' && selectedDeckId) {
        writePrefsForDeck(selectedDeckId, playerName.trim(), playerId.trim())
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'play-pokemon-decklist.pdf'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar PDF')
    } finally {
      setPending(false)
    }
  }

  const listOriginOptions = useMemo(() => {
    if (!loadedDeck) return [] as { value: ListOrigin; label: string }[]
    const o: { value: ListOrigin; label: string }[] = [
      { value: 'base', label: 'Listado base (mazo al crearlo)' }
    ]
    for (const v of loadedDeck.variants) {
      o.push({ value: v.id, label: v.label })
    }
    return o
  }, [loadedDeck])

  const hasSavedDecks = decklistSummaries.length > 0
  const noSavedDecksHint = source === 'saved' && !listLoading && !hasSavedDecks

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
          opacity: theme.palette.mode === 'dark' ? 0.06 : 0.09,
          backgroundImage: `radial-gradient(ellipse 120% 80% at 0% 0%, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 55%), radial-gradient(ellipse 90% 70% at 100% 15%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%), radial-gradient(circle at 50% 100%, ${alpha(theme.palette.primary.dark, 0.05)} 0%, transparent 42%)`
        }
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          position: 'relative',
          py: { xs: 3, sm: 4, md: 5 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Stack spacing={3.5} component="article">
          <Button
            component={Link}
            href="/dashboard"
            startIcon={<ArrowBackIcon />}
            variant="text"
            color="inherit"
            sx={{
              alignSelf: 'flex-start',
              px: 1,
              minWidth: 0,
              color: 'text.secondary',
              fontWeight: 600,
              borderRadius: 1.5,
              transition: 'color 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.06)
              }
            }}
          >
            Volver al panel
          </Button>

          <Stack spacing={1.25}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: '0.12em',
                fontWeight: 700,
                color: 'primary.main'
              }}
            >
              Play! Pokémon
            </Typography>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.12,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '1.9rem' }
              }}
            >
              Hoja de listas (PDF)
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              fontWeight={500}
              sx={{
                maxWidth: 'min(62ch, 100%)',
                lineHeight: 1.65,
                textWrap: 'pretty',
                fontSize: { xs: '0.9375rem', sm: '1rem' }
              }}
            >
              Genera el PDF oficial. Puedes pegar un listado o elegir un mazo
              guardado; en ese caso se rellenan tu nombre y POP ID (perfil o
              última descarga con ese mazo).
            </Typography>
          </Stack>

          <Paper
            elevation={0}
            component="section"
            aria-labelledby="pdf-form-heading"
            sx={{
              p: { xs: 2, sm: 2.75 },
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              borderLeft: '4px solid',
              borderLeftColor: 'primary.main',
              bgcolor: 'background.paper',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 14px 40px -24px ${alpha('#000', 0.5)}`
                  : `0 14px 40px -28px ${alpha(theme.palette.primary.dark, 0.16)}`
            }}
          >
            <Typography
              id="pdf-form-heading"
              variant="subtitle1"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2.5 }}
            >
              Datos del formulario
            </Typography>

            <Stack spacing={3.25} component="form" noValidate>
              <Stack spacing={1.75}>
                {sectionLabel('Listado')}
                {listLoading && source === 'saved' ? (
                  <LinearProgress
                    color="primary"
                    sx={{ borderRadius: 1, maxWidth: 280 }}
                    aria-label="Cargando mazos guardados"
                  />
                ) : null}
                <FormControl fullWidth size="small">
                  <InputLabel id="source-label">Origen del listado</InputLabel>
                  <Select
                    labelId="source-label"
                    label="Origen del listado"
                    value={source}
                    onChange={e => {
                      const v = e.target.value as 'manual' | 'saved'
                      setSource(v)
                      setError(null)
                      if (v === 'manual') {
                        setSelectedDeckId('')
                        setLoadedDeck(null)
                        if (me?.name) setPlayerName(me.name)
                        setPlayerId(me?.popid ?? '')
                      }
                    }}
                  >
                    <MenuItem value="manual">
                      Escribir o pegar en el recuadro
                    </MenuItem>
                    <MenuItem
                      value="saved"
                      disabled={listLoading || !hasSavedDecks}
                    >
                      Mazo guardado
                    </MenuItem>
                  </Select>
                  {!hasSavedDecks && !listLoading ? (
                    <FormHelperText sx={{ m: 0, mt: 0.5 }}>
                      <Box component="span" sx={{ display: 'block' }}>
                        Aún no hay mazos guardados.{' '}
                        <Box
                          component={Link}
                          href="/dashboard/decklists/nuevo"
                          sx={{
                            color: 'primary.main',
                            fontWeight: 600,
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                        >
                          Crear un decklist
                        </Box>
                      </Box>
                    </FormHelperText>
                  ) : null}
                </FormControl>

                {source === 'saved' ? (
                  <FormControl fullWidth size="small" error={noSavedDecksHint}>
                    <InputLabel id="deck-label">Mazo</InputLabel>
                    <Select
                      labelId="deck-label"
                      label="Mazo"
                      value={selectedDeckId}
                      onChange={e =>
                        void handleSelectDeck(String(e.target.value))
                      }
                    >
                      <MenuItem value="">
                        <em>Elige un mazo…</em>
                      </MenuItem>
                      {decklistSummaries.map((d: SavedDecklistSummary) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {noSavedDecksHint ? (
                      <FormHelperText>
                        Necesitas al menos un mazo en tu cuenta.
                      </FormHelperText>
                    ) : null}
                  </FormControl>
                ) : null}

                {source === 'saved' &&
                loadedDeck &&
                listOriginOptions.length > 1 ? (
                  <FormControl fullWidth size="small">
                    <InputLabel id="origin-label">
                      Qué listado exportar
                    </InputLabel>
                    <Select
                      labelId="origin-label"
                      label="Qué listado exportar"
                      value={listOrigin}
                      onChange={e => {
                        const v = e.target.value as ListOrigin
                        setListOrigin(v)
                        setDeckText(deckTextForOrigin(loadedDeck, v))
                      }}
                    >
                      {listOriginOptions.map(o => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : null}

                <TextField
                  label="Listado (texto del mazo)"
                  value={deckText}
                  onChange={e => {
                    setDeckText(e.target.value)
                    if (source === 'saved') {
                      setSource('manual')
                      setSelectedDeckId('')
                      setLoadedDeck(null)
                      setListOrigin('base')
                    }
                  }}
                  fullWidth
                  multiline
                  minRows={12}
                  required
                  size="small"
                  inputProps={{ spellCheck: false }}
                  placeholder={'##Pokémon\n4 Dreepy TWM 128\n...'}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: theme.typography.fontFamily,
                      fontSize: { xs: '0.8rem', sm: '0.8125rem' },
                      lineHeight: 1.5,
                      fontVariantNumeric: 'tabular-nums'
                    }
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  Si editas el texto a mano después de elegir un mazo, el origen
                  vuelve a &quot;escribir o pegar&quot;.
                </Typography>
              </Stack>

              <Divider flexItem />

              <Stack spacing={1.75}>
                {sectionLabel('Jugador')}
                <Stack
                  spacing={1.75}
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ alignItems: { sm: 'flex-start' } }}
                >
                  <TextField
                    label="Nombre del jugador"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    autoComplete="name"
                  />
                  <TextField
                    label="POP ID (Player ID)"
                    value={playerId}
                    onChange={e => setPlayerId(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Opcional en algunos torneos"
                    inputProps={{ inputMode: 'text' }}
                  />
                </Stack>
                <TextField
                  label="Fecha de nacimiento"
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  required
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: '2100-12-31' }}
                />
                <Stack spacing={1}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ letterSpacing: '0.02em' }}
                  >
                    Categoría
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={ageDivision}
                    onChange={(_e, v: AgeDivisionChoice | null) => {
                      if (v != null) setAgeDivision(v)
                    }}
                    sx={{
                      '& .MuiToggleButton-root': {
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 1.1,
                        '&.Mui-selected': {
                          color: 'primary.contrastText',
                          bgcolor: 'primary.main',
                          borderColor: 'primary.main',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                            borderColor: 'primary.dark'
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="junior">Junior</ToggleButton>
                    <ToggleButton value="senior">Senior</ToggleButton>
                    <ToggleButton value="masters">Máster</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Stack>

              {error ? (
                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{ borderRadius: 2 }}
                >
                  {error}
                </Alert>
              ) : null}

              <Button
                type="button"
                variant="contained"
                size="large"
                fullWidth
                startIcon={pending ? null : <PictureAsPdfIcon aria-hidden />}
                disabled={!canSubmit || pending}
                onClick={() => void handleGenerate()}
                sx={{
                  mt: 0.5,
                  fontWeight: 700,
                  py: 1.25,
                  borderRadius: 2,
                  alignSelf: { xs: 'stretch', sm: 'flex-end' },
                  minWidth: { sm: 220 },
                  boxShadow: t =>
                    `0 8px 24px -6px ${alpha(t.palette.primary.main, 0.45)}`,
                  transition:
                    'transform 0.18s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                  '&:hover': {
                    boxShadow: t =>
                      `0 10px 28px -4px ${alpha(t.palette.primary.main, 0.5)}`
                  },
                  '&:active': {
                    transform: 'scale(0.99)'
                  }
                }}
              >
                {pending ? 'Generando…' : 'Descargar PDF'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}
