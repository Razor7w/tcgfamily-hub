'use client'

import { useMemo, useState, type HTMLAttributes, type Key } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  filterPokemonAutocompleteOptions,
  POKEMON_AUTOCOMPLETE_HINT_EMPTY,
  POKEMON_AUTOCOMPLETE_NO_MATCH,
  type PokemonSpeciesOption,
  usePokemonSpeciesOptions
} from '@/hooks/usePokemonSpeciesOptions'
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions
} from '@/lib/limitless-pokemon-sprite'

type AutocompleteLiProps = HTMLAttributes<HTMLLIElement> & { key?: Key }

function renderPokemonOption(
  props: AutocompleteLiProps,
  option: PokemonSpeciesOption
) {
  const { key, children, ...rest } = props
  void children
  return (
    <li key={key ?? option.slug} {...rest}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SpriteThumb slug={option.slug} />
        <Typography variant="body2">{option.label}</Typography>
      </Box>
    </li>
  )
}

function SpriteThumb({ slug, size = 28 }: { slug: string; size?: number }) {
  const { width: w, height: h } = limitlessSpriteDimensions(size)
  return (
    <Box
      component="img"
      className="pokemon"
      src={getLimitlessPokemonSpriteUrl(slug)}
      alt=""
      width={w}
      height={h}
      sx={{
        width: `${w}px`,
        height: `${h}px`,
        minWidth: `${w}px`,
        minHeight: `${h}px`,
        display: 'block',
        imageRendering: 'pixelated',
        objectFit: 'contain',
        flexShrink: 0
      }}
    />
  )
}

export type DecklistPokemonSlotPickersProps = {
  slot1: PokemonSpeciesOption | null
  slot2: PokemonSpeciesOption | null
  onSlot1Change: (v: PokemonSpeciesOption | null) => void
  onSlot2Change: (v: PokemonSpeciesOption | null) => void
  disabled?: boolean
}

/**
 * Dos autocompletados para elegir 1–2 Pokémon (sprites Limitless).
 * El segundo campo es opcional.
 */
export default function DecklistPokemonSlotPickers({
  slot1,
  slot2,
  onSlot1Change,
  onSlot2Change,
  disabled = false
}: DecklistPokemonSlotPickersProps) {
  const { data: allOptions = [], isPending: optionsLoading } =
    usePokemonSpeciesOptions()

  const [slot1Open, setSlot1Open] = useState(false)
  const [slot2Open, setSlot2Open] = useState(false)
  const [slot1Query, setSlot1Query] = useState('')
  const [slot2Query, setSlot2Query] = useState('')

  const optionsForSlot1 = useMemo(
    () => allOptions.filter(o => o.slug !== slot2?.slug),
    [allOptions, slot2?.slug]
  )
  const optionsForSlot2 = useMemo(
    () => allOptions.filter(o => o.slug !== slot1?.slug),
    [allOptions, slot1?.slug]
  )

  if (optionsLoading && allOptions.length === 0) {
    return (
      <Stack alignItems="center" py={3}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Cargando Pokémon…
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap>
      <Autocomplete
        fullWidth
        disabled={disabled}
        options={optionsForSlot1}
        loading={optionsLoading}
        value={slot1}
        onChange={(_e, v) => onSlot1Change(v)}
        inputValue={slot1Open ? slot1Query : (slot1?.label ?? '')}
        onInputChange={(_e, v) => {
          if (slot1Open) setSlot1Query(v)
        }}
        onOpen={() => {
          setSlot1Open(true)
          setSlot1Query('')
        }}
        onClose={(_e, reason) => {
          setSlot1Open(false)
          if (reason !== 'selectOption') setSlot1Query('')
        }}
        filterOptions={filterPokemonAutocompleteOptions}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.slug === b.slug}
        noOptionsText={
          !slot1Query.trim()
            ? POKEMON_AUTOCOMPLETE_HINT_EMPTY
            : POKEMON_AUTOCOMPLETE_NO_MATCH
        }
        renderOption={(props, option) =>
          renderPokemonOption(props as AutocompleteLiProps, option)
        }
        renderInput={params => (
          <TextField
            {...params}
            label="Pokémon 1"
            placeholder="Busca por nombre…"
          />
        )}
      />
      <Autocomplete
        fullWidth
        disabled={disabled}
        options={optionsForSlot2}
        loading={optionsLoading}
        value={slot2}
        onChange={(_e, v) => onSlot2Change(v)}
        inputValue={slot2Open ? slot2Query : (slot2?.label ?? '')}
        onInputChange={(_e, v) => {
          if (slot2Open) setSlot2Query(v)
        }}
        onOpen={() => {
          setSlot2Open(true)
          setSlot2Query('')
        }}
        onClose={(_e, reason) => {
          setSlot2Open(false)
          if (reason !== 'selectOption') setSlot2Query('')
        }}
        filterOptions={filterPokemonAutocompleteOptions}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.slug === b.slug}
        noOptionsText={
          !slot2Query.trim()
            ? POKEMON_AUTOCOMPLETE_HINT_EMPTY
            : POKEMON_AUTOCOMPLETE_NO_MATCH
        }
        renderOption={(props, option) =>
          renderPokemonOption(props as AutocompleteLiProps, option)
        }
        renderInput={params => (
          <TextField
            {...params}
            label="Pokémon 2 (opcional)"
            placeholder="Busca por nombre…"
          />
        )}
      />
    </Stack>
  )
}

export function DecklistSpritePair({
  slugs,
  size = 40
}: {
  slugs: string[]
  size?: number
}) {
  const { height: slotH } = limitlessSpriteDimensions(size)
  return (
    <Box
      sx={theme => ({
        display: 'grid',
        gridTemplateColumns: `repeat(2, ${size}px)`,
        columnGap: theme.spacing(0.75),
        alignItems: 'center',
        justifyItems: 'center',
        flexShrink: 0
      })}
    >
      {([0, 1] as const).map(i => {
        const slug = slugs[i]
        if (!slug) {
          return (
            <Box
              key={`sprite-slot-${i}`}
              aria-hidden
              sx={{ width: size, height: slotH }}
            />
          )
        }
        return <SpriteThumb key={slug} slug={slug} size={size} />
      })}
    </Box>
  )
}
