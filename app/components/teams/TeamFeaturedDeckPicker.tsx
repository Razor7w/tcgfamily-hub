'use client'

import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import { useSavedDecklistsList } from '@/hooks/useSavedDecklists'
import { useUpdateTeamFeaturedDeck } from '@/hooks/useTeams'

type Props = {
  teamSlug: string
  featuredDecklistId: string | null
}

export default function TeamFeaturedDeckPicker({
  teamSlug,
  featuredDecklistId
}: Props) {
  const { data: decklists, isPending } = useSavedDecklistsList()
  const updateFeatured = useUpdateTeamFeaturedDeck(teamSlug)
  const publicDecks = useMemo(
    () => (decklists ?? []).filter(d => d.isPublic),
    [decklists]
  )

  const [selected, setSelected] = useState<string>(featuredDecklistId ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const selectedDeck = publicDecks.find(d => d.id === selected)

  async function handleSave() {
    setMsg(null)
    setErr(null)
    try {
      await updateFeatured.mutateAsync(selected || null)
      setMsg(
        selected
          ? 'Mazo destacado actualizado. Se verá en la página pública del equipo.'
          : 'Mazo destacado quitado de la página del equipo.'
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const dirty = (selected || '') !== (featuredDecklistId ?? '')

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Mazo favorito
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Elige un mazo público para mostrar en tu perfil del equipo. Solo se
        muestra uno por jugador.
      </Typography>

      {isPending ? (
        <Typography variant="body2" color="text.secondary">
          Cargando tus mazos…
        </Typography>
      ) : publicDecks.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Marca al menos un mazo como público en Mazos para poder destacarlo
          aquí.
        </Alert>
      ) : (
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="team-featured-deck-label">
              Mazo destacado
            </InputLabel>
            <Select
              labelId="team-featured-deck-label"
              label="Mazo destacado"
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              <MenuItem value="">
                <em>Ninguno</em>
              </MenuItem>
              {publicDecks.map(deck => (
                <MenuItem key={deck.id} value={deck.id}>
                  {deck.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedDeck ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <DecklistSpritePair slugs={selectedDeck.pokemonSlugs} size={36} />
              <Box>
                <Typography fontWeight={600}>{selectedDeck.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Vista previa
                </Typography>
              </Box>
            </Stack>
          ) : null}

          <Button
            variant="contained"
            disabled={!dirty || updateFeatured.isPending}
            onClick={() => void handleSave()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Guardar mazo destacado
          </Button>
        </Stack>
      )}

      {msg ? (
        <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
          {msg}
        </Alert>
      ) : null}
      {err ? (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {err}
        </Alert>
      ) : null}
    </Paper>
  )
}
