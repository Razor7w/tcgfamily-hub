'use client'

import { useMemo, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DecklistImagePreviewButton from '@/components/decklist/DecklistImagePreviewButton'
import { useSavedDecklistsList } from '@/hooks/useSavedDecklists'
import type { SavedDecklistSummary } from '@/hooks/useSavedDecklists'
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions
} from '@/lib/limitless-pokemon-sprite'

export type SavedDecklistTournamentOption = {
  key: string
  decklistId: string
  decklistName: string
  listKind: 'base' | 'variant'
  variantId: string | null
  sublabel: string
  pokemonSlugs: string[]
}

function buildFlatOptions(
  decklists: SavedDecklistSummary[]
): SavedDecklistTournamentOption[] {
  const out: SavedDecklistTournamentOption[] = []
  for (const d of decklists) {
    out.push({
      key: `${d.id}:base`,
      decklistId: d.id,
      decklistName: d.name,
      listKind: 'base',
      variantId: null,
      sublabel: 'Listado base',
      pokemonSlugs: [...d.pokemonSlugs]
    })
    for (const v of d.variants ?? []) {
      if (!v.id) continue
      out.push({
        key: `${d.id}:v:${v.id}`,
        decklistId: d.id,
        decklistName: d.name,
        listKind: 'variant',
        variantId: v.id,
        sublabel: v.label,
        pokemonSlugs: [...d.pokemonSlugs]
      })
    }
  }
  return out
}

function SpriteThumb({ slug, size = 22 }: { slug: string; size?: number }) {
  const { width: w, height: h } = limitlessSpriteDimensions(size)
  return (
    <Box
      component="img"
      alt=""
      src={getLimitlessPokemonSpriteUrl(slug)}
      width={w}
      height={h}
      sx={{
        width: `${w}px`,
        height: `${h}px`,
        minWidth: `${w}px`,
        imageRendering: 'pixelated',
        objectFit: 'contain',
        flexShrink: 0
      }}
    />
  )
}

function filterDecklistOptions(
  options: SavedDecklistTournamentOption[],
  state: { inputValue: string }
): SavedDecklistTournamentOption[] {
  const q = state.inputValue.trim().toLowerCase()
  if (!q) return options
  return options.filter(
    o =>
      o.decklistName.toLowerCase().includes(q) ||
      o.sublabel.toLowerCase().includes(q) ||
      `${o.decklistName} ${o.sublabel}`.toLowerCase().includes(q)
  )
}

type Props = {
  value: SavedDecklistTournamentOption | null
  onChange: (next: SavedDecklistTournamentOption | null) => void
  disabled?: boolean
  label?: string
  helperText?: string
  /** Muestra «Ver decklist» con la vista en imágenes al elegir un mazo */
  showViewDecklistButton?: boolean
}

/**
 * Autocomplete de mazos guardados: cada entrada es el listado base o una variante (misma identidad de sprites).
 */
export default function SavedDecklistVariantPicker({
  value,
  onChange,
  disabled = false,
  label = 'Mazo desde tus listas',
  helperText,
  showViewDecklistButton = true
}: Props) {
  const {
    data: decklists = [],
    isPending,
    isError,
    error
  } = useSavedDecklistsList()
  const options = useMemo(() => buildFlatOptions(decklists), [decklists])
  /** Valor preseleccionado (p. ej. desde el torneo) puede no existir aún en la lista cargada. */
  const autocompleteOptions = useMemo(() => {
    if (!value) return options
    if (options.some(o => o.key === value.key)) return options
    return [value, ...options]
  }, [options, value])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const handleAutocompleteChange = (
    _e: unknown,
    v: SavedDecklistTournamentOption | null
  ) => {
    onChange(v)
  }

  if (isPending && decklists.length === 0 && !value) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Cargando tus listas…
        </Typography>
      </Box>
    )
  }

  if (isError) {
    return (
      <Typography variant="body2" color="error">
        {error instanceof Error
          ? error.message
          : 'No se pudieron cargar los mazos'}
      </Typography>
    )
  }

  if (autocompleteOptions.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No tienes listas guardadas. Créalas en «Mis listas» en el panel.
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      <Autocomplete<SavedDecklistTournamentOption, false, false, false>
        fullWidth
        disabled={disabled}
        options={autocompleteOptions}
        loading={isPending}
        value={value}
        onChange={handleAutocompleteChange}
        inputValue={
          open
            ? query
            : value
              ? `${value.decklistName} — ${value.sublabel}`
              : ''
        }
        onInputChange={(_e, v) => {
          if (open) setQuery(v)
        }}
        onOpen={() => {
          setOpen(true)
          setQuery('')
        }}
        onClose={(_e, reason) => {
          setOpen(false)
          if (reason !== 'selectOption') setQuery('')
        }}
        filterOptions={filterDecklistOptions}
        getOptionLabel={o => `${o.decklistName} — ${o.sublabel}`}
        isOptionEqualToValue={(a, b) => a.key === b.key}
        noOptionsText="Sin coincidencias"
        renderOption={(props, option) => (
          <li {...props} key={option.key}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 0.25
              }}
            >
              <Box sx={{ display: 'flex', gap: 0.35, alignItems: 'center' }}>
                {option.pokemonSlugs.slice(0, 2).map(s => (
                  <SpriteThumb key={s} slug={s} size={24} />
                ))}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {option.decklistName}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {option.sublabel}
                </Typography>
              </Box>
            </Box>
          </li>
        )}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            helperText={helperText}
            placeholder="Busca por nombre de mazo o variante…"
          />
        )}
      />
      {value && showViewDecklistButton ? (
        <DecklistImagePreviewButton
          source={{
            kind: 'decklist',
            decklistId: value.decklistId,
            listKind: value.listKind,
            variantId: value.variantId,
            title: `${value.decklistName} — ${value.sublabel}`
          }}
          disabled={disabled}
        />
      ) : null}
    </Stack>
  )
}
