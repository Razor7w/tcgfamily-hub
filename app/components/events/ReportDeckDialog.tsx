'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type Key
} from 'react'
import CloseIcon from '@mui/icons-material/Close'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
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
import { useSaveMyDeck } from '@/hooks/useWeeklyEvents'

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

type ReportDeckDialogProps = {
  open: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
  initialSlugs: string[]
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

/**
 * Modal para reportar hasta 2 Pokémon del deck (sprites vía Limitless CDN).
 */
export default function ReportDeckDialog({
  open,
  onClose,
  eventId,
  eventTitle,
  initialSlugs
}: ReportDeckDialogProps) {
  const { data: allOptions = [], isPending: optionsLoading } =
    usePokemonSpeciesOptions()
  const saveDeck = useSaveMyDeck(eventId)

  const [slot1, setSlot1] = useState<PokemonSpeciesOption | null>(null)
  const [slot2, setSlot2] = useState<PokemonSpeciesOption | null>(null)
  const [slot1Open, setSlot1Open] = useState(false)
  const [slot2Open, setSlot2Open] = useState(false)
  const [slot1Query, setSlot1Query] = useState('')
  const [slot2Query, setSlot2Query] = useState('')

  const optionBySlug = useMemo(() => {
    const m = new Map<string, PokemonSpeciesOption>()
    for (const o of allOptions) {
      m.set(o.slug, o)
    }
    return m
  }, [allOptions])

  useEffect(() => {
    if (!open || optionsLoading || allOptions.length === 0) return
    const a = initialSlugs[0]
      ? (optionBySlug.get(initialSlugs[0]) ?? null)
      : null
    const b = initialSlugs[1]
      ? (optionBySlug.get(initialSlugs[1]) ?? null)
      : null
    /* Sincronizar selección inicial del modal con slugs ya guardados (datos async). */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlot1(a)
    setSlot2(b)
  }, [open, optionsLoading, allOptions.length, optionBySlug, initialSlugs])

  const optionsForSlot1 = useMemo(
    () => allOptions.filter(o => o.slug !== slot2?.slug),
    [allOptions, slot2?.slug]
  )
  const optionsForSlot2 = useMemo(
    () => allOptions.filter(o => o.slug !== slot1?.slug),
    [allOptions, slot1?.slug]
  )

  const handleClose = useCallback(() => {
    if (!saveDeck.isPending) onClose()
  }, [onClose, saveDeck.isPending])

  const handleSave = () => {
    const pokemon = [slot1?.slug, slot2?.slug].filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    )
    saveDeck.mutate(pokemon, { onSuccess: () => onClose() })
  }

  const showChips = Boolean(slot1 || slot2)

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        Agrega tu deck para {eventTitle}
        <IconButton
          aria-label="Cerrar"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={saveDeck.isPending}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {optionsLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Cargando Pokémon…
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              useFlexGap
            >
              <Autocomplete
                fullWidth
                options={optionsForSlot1}
                loading={optionsLoading}
                value={slot1}
                onChange={(_e, v) => setSlot1(v)}
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
                    label="Pokémon"
                    placeholder="Busca por nombre…"
                  />
                )}
              />
              <Autocomplete
                fullWidth
                options={optionsForSlot2}
                loading={optionsLoading}
                value={slot2}
                onChange={(_e, v) => setSlot2(v)}
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
                    label="Pokémon"
                    placeholder="Busca por nombre…"
                  />
                )}
              />
            </Stack>

            {showChips ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {slot1 ? (
                  <Chip
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <SpriteThumb slug={slot1.slug} size={22} />
                        <Typography variant="body2" component="span">
                          {slot1.slug}
                        </Typography>
                      </Stack>
                    }
                    onDelete={() => setSlot1(null)}
                    variant="outlined"
                  />
                ) : null}
                {slot2 ? (
                  <Chip
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <SpriteThumb slug={slot2.slug} size={22} />
                        <Typography variant="body2" component="span">
                          {slot2.slug}
                        </Typography>
                      </Stack>
                    }
                    onDelete={() => setSlot2(null)}
                    variant="outlined"
                  />
                ) : null}
              </Stack>
            ) : null}

            {saveDeck.isError ? (
              <Typography color="error" variant="body2">
                {saveDeck.error instanceof Error
                  ? saveDeck.error.message
                  : 'Error al guardar'}
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saveDeck.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={optionsLoading || saveDeck.isPending}
        >
          {saveDeck.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
