'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DecklistPokemonSlotPickers from '@/components/decklist/DecklistPokemonSlotPickers'
import {
  type PokemonSpeciesOption,
  usePokemonSpeciesOptions
} from '@/hooks/usePokemonSpeciesOptions'
import { SAVED_DECKLIST_NAME_MAX } from '@/lib/saved-decklist-validation'

function slotsFromSlugs(
  slugs: string[],
  options: PokemonSpeciesOption[]
): { slot1: PokemonSpeciesOption | null; slot2: PokemonSpeciesOption | null } {
  const a = slugs[0]
  const b = slugs[1]
  return {
    slot1: a ? (options.find(o => o.slug === a) ?? null) : null,
    slot2: b ? (options.find(o => o.slug === b) ?? null) : null
  }
}

export type DecklistAppliedMeta = {
  name: string
  pokemonSlugs: string[]
  updatedAt: string
}

type Props = {
  decklistId: string
  draftName: string
  draftSlugs: string[]
  fullOpen: boolean
  spritesOpen: boolean
  onCloseFull: () => void
  onCloseSprites: () => void
  onApplied: (payload: DecklistAppliedMeta) => void
}

export default function DecklistDeckMetaDialogs({
  decklistId,
  draftName,
  draftSlugs,
  fullOpen,
  spritesOpen,
  onCloseFull,
  onCloseSprites,
  onApplied
}: Props) {
  const { data: speciesOptions = [], isPending: speciesLoading } =
    usePokemonSpeciesOptions()

  const [name, setName] = useState(draftName)
  const [slot1, setSlot1] = useState<PokemonSpeciesOption | null>(null)
  const [slot2, setSlot2] = useState<PokemonSpeciesOption | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!fullOpen && !spritesOpen) return
    setName(draftName)
    setError(null)
  }, [fullOpen, spritesOpen, draftName])

  useEffect(() => {
    if (!fullOpen && !spritesOpen) return
    if (speciesOptions.length === 0) return
    const { slot1: s1, slot2: s2 } = slotsFromSlugs(draftSlugs, speciesOptions)
    setSlot1(s1)
    setSlot2(s2)
  }, [fullOpen, spritesOpen, draftSlugs, speciesOptions])

  const handleSlot1Change = (v: PokemonSpeciesOption | null) => {
    setSlot1(v)
    if (!v) setSlot2(null)
    else setSlot2(prev => (prev && prev.slug === v.slug ? null : prev))
  }

  const pokemonPayload = (): string[] | null => {
    if (!slot1?.slug) return null
    return slot2?.slug ? [slot1.slug, slot2.slug] : [slot1.slug]
  }

  const parseApplied = (
    j: Record<string, unknown>
  ): DecklistAppliedMeta | null => {
    const nameOk = typeof j.name === 'string' ? j.name : ''
    const raw = j.pokemonSlugs
    const slugs = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string')
      : []
    const updatedAt = typeof j.updatedAt === 'string' ? j.updatedAt : ''
    if (!nameOk || !updatedAt) return null
    return { name: nameOk, pokemonSlugs: slugs, updatedAt }
  }

  const patchDeck = async (
    body: Record<string, unknown>,
    close: 'full' | 'sprites'
  ) => {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/decklists/${decklistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'No se pudo guardar')
        return
      }
      const applied = parseApplied(j)
      if (!applied) {
        setError('Respuesta inválida del servidor')
        return
      }
      onApplied(applied)
      if (close === 'full') onCloseFull()
      else onCloseSprites()
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setPending(false)
    }
  }

  const handleSaveFull = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > SAVED_DECKLIST_NAME_MAX) {
      setError(
        `Nombre obligatorio (máx. ${SAVED_DECKLIST_NAME_MAX} caracteres)`
      )
      return
    }
    const pokemon = pokemonPayload()
    if (!pokemon) {
      setError('Elige al menos un Pokémon para los sprites.')
      return
    }
    void patchDeck({ name: trimmed, pokemon }, 'full')
  }

  const handleSaveSprites = () => {
    const pokemon = pokemonPayload()
    if (!pokemon) {
      setError('Elige al menos un Pokémon para los sprites.')
      return
    }
    void patchDeck({ pokemon }, 'sprites')
  }

  const canPickSprites = speciesOptions.length > 0 && !speciesLoading

  return (
    <>
      <Dialog
        open={fullOpen}
        onClose={() => !pending && onCloseFull()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Editar mazo
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Cambia el nombre visible y los Pokémon de los sprites (1
              obligatorio, 2 opcional).
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Nombre del mazo"
              value={name}
              onChange={e => setName(e.target.value)}
              fullWidth
              required
              disabled={pending}
              inputProps={{ maxLength: SAVED_DECKLIST_NAME_MAX }}
              helperText={`${name.trim().length}/${SAVED_DECKLIST_NAME_MAX}`}
            />
            {!canPickSprites ? (
              <Typography variant="body2" color="text.secondary">
                Cargando lista de Pokémon…
              </Typography>
            ) : (
              <DecklistPokemonSlotPickers
                slot1={slot1}
                slot2={slot2}
                onSlot1Change={handleSlot1Change}
                onSlot2Change={setSlot2}
                disabled={pending}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => !pending && onCloseFull()} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveFull}
            disabled={pending || !canPickSprites}
            sx={{ fontWeight: 700 }}
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={spritesOpen}
        onClose={() => !pending && onCloseSprites()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Sprites del mazo
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Elige uno u dos Pokémon para los iconos del mazo.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {!canPickSprites ? (
              <Typography variant="body2" color="text.secondary">
                Cargando lista de Pokémon…
              </Typography>
            ) : (
              <DecklistPokemonSlotPickers
                slot1={slot1}
                slot2={slot2}
                onSlot1Change={handleSlot1Change}
                onSlot2Change={setSlot2}
                disabled={pending}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => !pending && onCloseSprites()}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSprites}
            disabled={pending || !canPickSprites}
            sx={{ fontWeight: 700 }}
          >
            {pending ? 'Guardando…' : 'Guardar sprites'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
