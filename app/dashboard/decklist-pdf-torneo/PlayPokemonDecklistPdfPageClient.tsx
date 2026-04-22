'use client'

import { useEffect, useMemo, useState } from 'react'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
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

export default function PlayPokemonDecklistPdfPageClient() {
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

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          PDF listas (Play! Pokémon)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Genera la hoja oficial: pega un listado o carga un mazo guardado. Si
          eliges un mazo, se rellenan tu nombre y POP ID (perfil o último usado
          con ese mazo).
        </Typography>
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5}>
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
                <MenuItem value="saved" disabled={listLoading}>
                  Mazo guardado
                </MenuItem>
              </Select>
            </FormControl>

            {source === 'saved' ? (
              <FormControl fullWidth size="small">
                <InputLabel id="deck-label">Mazo</InputLabel>
                <Select
                  labelId="deck-label"
                  label="Mazo"
                  value={selectedDeckId}
                  onChange={e => void handleSelectDeck(String(e.target.value))}
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
              </FormControl>
            ) : null}

            {source === 'saved' &&
            loadedDeck &&
            listOriginOptions.length > 1 ? (
              <FormControl fullWidth size="small">
                <InputLabel id="origin-label">Qué listado exportar</InputLabel>
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
              placeholder={'##Pokémon\n4 Dreepy TWM 128\n...'}
            />

            <TextField
              label="Nombre del jugador"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              required
              fullWidth
              autoComplete="name"
            />
            <TextField
              label="POP ID (Player ID)"
              value={playerId}
              onChange={e => setPlayerId(e.target.value)}
              fullWidth
              placeholder="Opcional en algunos torneos"
            />
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Stack spacing={0.75}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
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
              >
                <ToggleButton value="junior">Junior</ToggleButton>
                <ToggleButton value="senior">Senior</ToggleButton>
                <ToggleButton value="masters">Máster</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Button
              variant="contained"
              size="large"
              startIcon={<PictureAsPdfIcon />}
              disabled={!canSubmit || pending}
              onClick={() => void handleGenerate()}
              sx={{ fontWeight: 700, alignSelf: 'flex-start' }}
            >
              {pending ? 'Generando…' : 'Descargar PDF'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
