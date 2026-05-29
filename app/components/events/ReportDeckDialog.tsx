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
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SavedDecklistVariantPicker, {
  type SavedDecklistTournamentOption
} from '@/components/decklist/SavedDecklistVariantPicker'
import { useSavedDecklistsList } from '@/hooks/useSavedDecklists'
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
import { findDecklistPickByRef } from '@/lib/tournament-decklist-initial-pick'
import {
  useSaveMyDeck,
  type MyTournamentDecklistRefDTO
} from '@/hooks/useWeeklyEvents'
import { useContributionAwardSnackbar } from '@/hooks/useContributionAwardSnackbar'

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
  /** Mazo + listado ya vinculados al torneo (preselección del Autocomplete). */
  initialDecklistPick?: SavedDecklistTournamentOption | null
  /** Alternativa a `initialDecklistPick` cuando solo hay ref (p. ej. vista semanal). */
  initialDecklistRef?: MyTournamentDecklistRefDTO | null
  /** Título del modal/drawer; por defecto según contexto. */
  title?: string
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

function TournamentDeckFormBody({
  eventTitle,
  title,
  optionsLoading,
  saveDeck,
  decklistPick,
  applyDecklistPick,
  slot1,
  slot2,
  slot1Open,
  slot2Open,
  slot1Query,
  slot2Query,
  setSlot1Open,
  setSlot2Open,
  setSlot1Query,
  setSlot2Query,
  optionsForSlot1,
  optionsForSlot2,
  handleSlot1Change,
  handleSlot2Change,
  setDecklistPick,
  setSlot1,
  setSlot2,
  hasSprites,
  validationHint
}: {
  eventTitle: string
  title: string
  optionsLoading: boolean
  saveDeck: ReturnType<typeof useSaveMyDeck>
  decklistPick: SavedDecklistTournamentOption | null
  applyDecklistPick: (opt: SavedDecklistTournamentOption | null) => void
  slot1: PokemonSpeciesOption | null
  slot2: PokemonSpeciesOption | null
  slot1Open: boolean
  slot2Open: boolean
  slot1Query: string
  slot2Query: string
  setSlot1Open: (v: boolean) => void
  setSlot2Open: (v: boolean) => void
  setSlot1Query: (v: string) => void
  setSlot2Query: (v: string) => void
  optionsForSlot1: PokemonSpeciesOption[]
  optionsForSlot2: PokemonSpeciesOption[]
  handleSlot1Change: (_e: unknown, v: PokemonSpeciesOption | null) => void
  handleSlot2Change: (_e: unknown, v: PokemonSpeciesOption | null) => void
  setDecklistPick: (v: SavedDecklistTournamentOption | null) => void
  setSlot1: (v: PokemonSpeciesOption | null) => void
  setSlot2: (v: PokemonSpeciesOption | null) => void
  hasSprites: boolean
  validationHint: string | null
}) {
  const showChips = Boolean(slot1 || slot2)

  if (optionsLoading) {
    return (
      <Stack alignItems="center" py={4}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Cargando Pokémon…
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {title === 'Tu deck para el torneo'
          ? `Sprites y listado para ${eventTitle}. Solo tú ves el listado completo; otros jugadores no tendrán acceso a esta información.`
          : `Elige los sprites de tu mazo. El listado guardado es opcional.`}
      </Typography>
      <SavedDecklistVariantPicker
        value={decklistPick}
        onChange={applyDecklistPick}
        disabled={saveDeck.isPending}
        helperText="Opcional: carga sprites y referencia al listado guardado."
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          my: 0.5
        }}
      >
        <Box sx={{ flex: 1, borderTop: '1px solid', borderColor: 'divider' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Sprites del mazo (obligatorio, hasta 2)
        </Typography>
        <Box sx={{ flex: 1, borderTop: '1px solid', borderColor: 'divider' }} />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap>
        <Autocomplete
          fullWidth
          options={optionsForSlot1}
          loading={optionsLoading}
          value={slot1}
          onChange={handleSlot1Change}
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
              required
            />
          )}
        />
        <Autocomplete
          fullWidth
          options={optionsForSlot2}
          loading={optionsLoading}
          value={slot2}
          onChange={handleSlot2Change}
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
              onDelete={() => {
                setDecklistPick(null)
                setSlot1(null)
              }}
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
              onDelete={() => {
                setDecklistPick(null)
                setSlot2(null)
              }}
              variant="outlined"
            />
          ) : null}
        </Stack>
      ) : null}

      {!hasSprites && validationHint ? (
        <Typography variant="body2" color="warning.main">
          {validationHint}
        </Typography>
      ) : null}

      {saveDeck.isError ? (
        <Typography color="error" variant="body2">
          {saveDeck.error instanceof Error
            ? saveDeck.error.message
            : 'Error al guardar'}
        </Typography>
      ) : null}
    </Stack>
  )
}

/**
 * Modal (escritorio) o drawer (móvil) para sprites y listado opcional del torneo.
 */
export default function ReportDeckDialog({
  open,
  onClose,
  eventId,
  eventTitle,
  initialSlugs,
  initialDecklistPick = null,
  initialDecklistRef = null,
  title: titleProp
}: ReportDeckDialogProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { data: allOptions = [], isPending: optionsLoading } =
    usePokemonSpeciesOptions()
  const { data: savedDecklists = [] } = useSavedDecklistsList()
  const saveDeck = useSaveMyDeck(eventId)
  const { notifyAwarded, snackbar: contributionSnackbar } =
    useContributionAwardSnackbar()

  const resolvedInitialPick = useMemo(() => {
    if (initialDecklistPick) return initialDecklistPick
    if (!initialDecklistRef || savedDecklists.length === 0) return null
    const flat: SavedDecklistTournamentOption[] = []
    for (const d of savedDecklists) {
      flat.push({
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
        flat.push({
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
    return findDecklistPickByRef(flat, initialDecklistRef)
  }, [initialDecklistPick, initialDecklistRef, savedDecklists])

  const dialogTitle = titleProp ?? 'Tu deck para el torneo'

  const [decklistPick, setDecklistPick] =
    useState<SavedDecklistTournamentOption | null>(null)
  const [slot1, setSlot1] = useState<PokemonSpeciesOption | null>(null)
  const [slot2, setSlot2] = useState<PokemonSpeciesOption | null>(null)
  const [slot1Open, setSlot1Open] = useState(false)
  const [slot2Open, setSlot2Open] = useState(false)
  const [slot1Query, setSlot1Query] = useState('')
  const [slot2Query, setSlot2Query] = useState('')
  const [validationHint, setValidationHint] = useState<string | null>(null)

  const optionBySlug = useMemo(() => {
    const m = new Map<string, PokemonSpeciesOption>()
    for (const o of allOptions) {
      m.set(o.slug, o)
    }
    return m
  }, [allOptions])

  useEffect(() => {
    if (!open || optionsLoading || allOptions.length === 0) return
    const slugSource =
      resolvedInitialPick?.pokemonSlugs?.length &&
      resolvedInitialPick.pokemonSlugs.some(Boolean)
        ? resolvedInitialPick.pokemonSlugs
        : initialSlugs
    const a = slugSource[0] ? (optionBySlug.get(slugSource[0]) ?? null) : null
    const b = slugSource[1] ? (optionBySlug.get(slugSource[1]) ?? null) : null
    /* Sincronizar selección inicial del modal con slugs ya guardados (datos async). */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecklistPick(resolvedInitialPick ?? null)
    setSlot1(a)
    setSlot2(b)
    setValidationHint(null)
  }, [
    open,
    optionsLoading,
    allOptions.length,
    optionBySlug,
    initialSlugs,
    resolvedInitialPick
  ])

  const optionsForSlot1 = useMemo(
    () => allOptions.filter(o => o.slug !== slot2?.slug),
    [allOptions, slot2?.slug]
  )
  const optionsForSlot2 = useMemo(
    () => allOptions.filter(o => o.slug !== slot1?.slug),
    [allOptions, slot1?.slug]
  )

  const hasSprites = Boolean(slot1 || slot2)

  const handleClose = useCallback(() => {
    if (!saveDeck.isPending) onClose()
  }, [onClose, saveDeck.isPending])

  const applyDecklistPick = (opt: SavedDecklistTournamentOption | null) => {
    setDecklistPick(opt)
    if (!opt) return
    const slugs = opt.pokemonSlugs
    setSlot1(slugs[0] ? (optionBySlug.get(slugs[0]) ?? null) : null)
    setSlot2(slugs[1] ? (optionBySlug.get(slugs[1]) ?? null) : null)
    setValidationHint(null)
  }

  const handleSlot1Change = (_e: unknown, v: PokemonSpeciesOption | null) => {
    setDecklistPick(null)
    setSlot1(v)
    setValidationHint(null)
  }

  const handleSlot2Change = (_e: unknown, v: PokemonSpeciesOption | null) => {
    setDecklistPick(null)
    setSlot2(v)
    setValidationHint(null)
  }

  const handleSave = () => {
    const pokemon = [slot1?.slug, slot2?.slug].filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    )
    if (pokemon.length === 0) {
      setValidationHint('Elige al menos un Pokémon (sprite del mazo).')
      return
    }
    const tournamentDecklistRef: MyTournamentDecklistRefDTO | null =
      decklistPick
        ? {
            decklistId: decklistPick.decklistId,
            listKind: decklistPick.listKind,
            variantId: decklistPick.variantId
          }
        : null
    saveDeck.mutate(
      { pokemon, tournamentDecklistRef },
      {
        onSuccess: data => {
          notifyAwarded(data.contributionPointsAwarded)
          onClose()
        }
      }
    )
  }

  const formBody = (
    <TournamentDeckFormBody
      eventTitle={eventTitle}
      title={dialogTitle}
      optionsLoading={optionsLoading}
      saveDeck={saveDeck}
      decklistPick={decklistPick}
      applyDecklistPick={applyDecklistPick}
      slot1={slot1}
      slot2={slot2}
      slot1Open={slot1Open}
      slot2Open={slot2Open}
      slot1Query={slot1Query}
      slot2Query={slot2Query}
      setSlot1Open={setSlot1Open}
      setSlot2Open={setSlot2Open}
      setSlot1Query={setSlot1Query}
      setSlot2Query={setSlot2Query}
      optionsForSlot1={optionsForSlot1}
      optionsForSlot2={optionsForSlot2}
      handleSlot1Change={handleSlot1Change}
      handleSlot2Change={handleSlot2Change}
      setDecklistPick={setDecklistPick}
      setSlot1={setSlot1}
      setSlot2={setSlot2}
      hasSprites={hasSprites}
      validationHint={validationHint}
    />
  )

  const actions = (
    <>
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
    </>
  )

  const closeButton = (
    <IconButton
      aria-label="Cerrar"
      onClick={handleClose}
      disabled={saveDeck.isPending}
      sx={{ position: 'absolute', right: 8, top: 8 }}
    >
      <CloseIcon />
    </IconButton>
  )

  if (isMobile) {
    return (
      <>
        <Drawer
          anchor="bottom"
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '92dvh'
            }
          }}
        >
          <Box sx={{ px: 2, pt: 1.5, pb: 2, position: 'relative' }}>
            <Typography variant="h6" fontWeight={700} sx={{ pr: 5, mb: 0.5 }}>
              {dialogTitle}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 1.5 }}
            >
              {eventTitle}
            </Typography>
            {closeButton}
            <Box sx={{ overflow: 'auto', maxHeight: 'calc(92dvh - 140px)' }}>
              {formBody}
            </Box>
            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ mt: 2 }}
            >
              {actions}
            </Stack>
          </Box>
        </Drawer>
        {contributionSnackbar}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          {dialogTitle}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {eventTitle}
          </Typography>
          {closeButton}
        </DialogTitle>
        <DialogContent dividers>{formBody}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>{actions}</DialogActions>
      </Dialog>
      {contributionSnackbar}
    </>
  )
}
