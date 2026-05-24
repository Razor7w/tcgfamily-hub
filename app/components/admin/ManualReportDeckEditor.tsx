'use client'

import { useEffect, useMemo, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import SavedDecklistVariantPicker, {
  type SavedDecklistTournamentOption
} from '@/components/decklist/SavedDecklistVariantPicker'
import {
  filterPokemonAutocompleteOptions,
  POKEMON_AUTOCOMPLETE_NO_MATCH,
  type PokemonSpeciesOption,
  usePokemonSpeciesOptions
} from '@/hooks/usePokemonSpeciesOptions'
import {
  useOwnerParticipantDecklists,
  useOwnerSaveParticipantDeck,
  type OwnerManualReportParticipant
} from '@/hooks/useOwnerManualReport'
import type { MyTournamentDecklistRefDTO } from '@/hooks/useWeeklyEvents'
import {
  findDecklistPickByRef,
  initialDecklistPickFromTournament
} from '@/lib/tournament-decklist-initial-pick'
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions
} from '@/lib/limitless-pokemon-sprite'

type Props = {
  eventId: string
  participant: OwnerManualReportParticipant
  onSaved?: () => void
}

function SpriteThumb({ slug, size = 24 }: { slug: string; size?: number }) {
  const { width: w, height: h } = limitlessSpriteDimensions(size)
  return (
    <Box
      component="img"
      alt=""
      src={getLimitlessPokemonSpriteUrl(slug)}
      sx={{
        width: w,
        height: h,
        imageRendering: 'pixelated',
        objectFit: 'contain',
        flexShrink: 0
      }}
    />
  )
}

export default function ManualReportDeckEditor({
  eventId,
  participant,
  onSaved
}: Props) {
  const theme = useTheme()
  const userId = participant.userId ?? ''
  const participantId = participant.participantId ?? ''
  const hasAccount = Boolean(userId)
  const save = useOwnerSaveParticipantDeck(eventId)
  const { data: allOptions = [], isPending: speciesLoading } =
    usePokemonSpeciesOptions()
  const {
    data: playerDecklists = [],
    isPending: listsLoading,
    isError: listsError,
    error: listsErrorObj
  } = useOwnerParticipantDecklists(userId)

  const flatDeckOptions = useMemo(() => {
    const out: SavedDecklistTournamentOption[] = []
    for (const d of playerDecklists) {
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
  }, [playerDecklists])

  const [decklistPick, setDecklistPick] =
    useState<SavedDecklistTournamentOption | null>(null)
  const [slot1, setSlot1] = useState<PokemonSpeciesOption | null>(null)
  const [slot2, setSlot2] = useState<PokemonSpeciesOption | null>(null)
  const [validationHint, setValidationHint] = useState<string | null>(null)

  const optionBySlug = useMemo(() => {
    const m = new Map<string, PokemonSpeciesOption>()
    for (const o of allOptions) m.set(o.slug, o)
    return m
  }, [allOptions])

  const participantDeckSlugsKey = participant.deckPokemonSlugs.join('|')
  const tournamentDecklistRefKey = participant.tournamentDecklistRef
    ? `${participant.tournamentDecklistRef.decklistId}:${participant.tournamentDecklistRef.listKind}:${participant.tournamentDecklistRef.variantId ?? ''}`
    : ''
  const playerDecklistsKey = playerDecklists.map(d => d.id).join(',')

  useEffect(() => {
    if (speciesLoading || allOptions.length === 0) return
    const fromDisplay = hasAccount
      ? initialDecklistPickFromTournament(
          participant.tournamentDecklistRef,
          participant.tournamentDecklistDisplay,
          participant.deckPokemonSlugs
        )
      : null
    const pick = hasAccount
      ? (fromDisplay ??
        findDecklistPickByRef(
          flatDeckOptions,
          participant.tournamentDecklistRef
        ))
      : null
    const slugSource =
      pick?.pokemonSlugs?.length && pick.pokemonSlugs.some(Boolean)
        ? pick.pokemonSlugs
        : participant.deckPokemonSlugs
    const a = slugSource[0] ? (optionBySlug.get(slugSource[0]) ?? null) : null
    const b = slugSource[1] ? (optionBySlug.get(slugSource[1]) ?? null) : null

    setDecklistPick(pick)
    setSlot1(a)
    setSlot2(b)
    setValidationHint(null)
    // Solo re-sincronizar al cambiar de jugador o datos guardados del servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flatDeckOptions/optionBySlug cambian referencia sin cambiar datos
  }, [
    hasAccount,
    speciesLoading,
    allOptions.length,
    participant.participantId,
    participantDeckSlugsKey,
    tournamentDecklistRefKey,
    playerDecklistsKey
  ])

  const applyDecklistPick = (opt: SavedDecklistTournamentOption | null) => {
    setDecklistPick(opt)
    if (!opt) return
    const slugs = opt.pokemonSlugs
    setSlot1(slugs[0] ? (optionBySlug.get(slugs[0]) ?? null) : null)
    setSlot2(slugs[1] ? (optionBySlug.get(slugs[1]) ?? null) : null)
    setValidationHint(null)
  }

  const handleSave = () => {
    const pokemon = [slot1?.slug, slot2?.slug].filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    )
    if (pokemon.length === 0) {
      setValidationHint('Indica al menos un sprite del mazo.')
      return
    }
    const tournamentDecklistRef: MyTournamentDecklistRefDTO | null =
      hasAccount && decklistPick
        ? {
            decklistId: decklistPick.decklistId,
            listKind: decklistPick.listKind,
            variantId: decklistPick.variantId
          }
        : null
    if (!hasAccount && !participantId) {
      setValidationHint(
        'Este inscrito no tiene ID de participante; vuelve a importar el torneo o vincula por POP.'
      )
      return
    }
    save.mutate(
      {
        userId: hasAccount ? userId : null,
        participantId: hasAccount ? null : participantId,
        pokemon,
        tournamentDecklistRef
      },
      { onSuccess: () => onSaved?.() }
    )
  }

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          p: 2,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.2),
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 70%)`
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          {participant.displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {hasAccount
            ? participant.userEmail || participant.userName || userId
            : participant.popId
              ? `POP ${participant.popId}`
              : 'Sin cuenta vinculada'}
          {hasAccount && participant.popId ? ` · POP ${participant.popId}` : ''}
        </Typography>
        {!hasAccount ? (
          <Chip
            size="small"
            label="Solo sprites"
            color="warning"
            variant="outlined"
            sx={{ mt: 1, fontWeight: 600 }}
          />
        ) : null}
      </Box>

      {speciesLoading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">
            Cargando especies…
          </Typography>
        </Stack>
      ) : (
        <>
          {hasAccount ? (
            <SavedDecklistVariantPicker
              value={decklistPick}
              onChange={applyDecklistPick}
              disabled={save.isPending}
              label="Mazo guardado del jugador"
              helperText="Opcional: referencia al listado en su biblioteca."
              showViewDecklistButton={false}
              decklistsOverride={playerDecklists}
              decklistsLoadingOverride={listsLoading}
              decklistsErrorOverride={
                listsError && listsErrorObj instanceof Error
                  ? listsErrorObj
                  : listsError
                    ? new Error('Error al cargar listas')
                    : null
              }
              emptyListsMessage="Este jugador no tiene listas guardadas en su cuenta."
            />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.55 }}
            >
              Sin cuenta en la plataforma: solo puedes asignar sprites del mazo
              (metagame y meta del torneo). Para listado guardado, vincula la
              cuenta por POP en el evento.
            </Typography>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Sprites (obligatorio)
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
          >
            <Autocomplete
              fullWidth
              options={allOptions.filter(o => o.slug !== slot2?.slug)}
              value={slot1}
              onChange={(_e, v) => {
                setDecklistPick(null)
                setSlot1(v)
                setValidationHint(null)
              }}
              filterOptions={filterPokemonAutocompleteOptions}
              getOptionLabel={o => o.label}
              isOptionEqualToValue={(a, b) => a.slug === b.slug}
              noOptionsText={POKEMON_AUTOCOMPLETE_NO_MATCH}
              renderInput={params => (
                <TextField {...params} label="Pokémon 1" required />
              )}
            />
            <Autocomplete
              fullWidth
              options={allOptions.filter(o => o.slug !== slot1?.slug)}
              value={slot2}
              onChange={(_e, v) => {
                setDecklistPick(null)
                setSlot2(v)
                setValidationHint(null)
              }}
              filterOptions={filterPokemonAutocompleteOptions}
              getOptionLabel={o => o.label}
              isOptionEqualToValue={(a, b) => a.slug === b.slug}
              noOptionsText={POKEMON_AUTOCOMPLETE_NO_MATCH}
              renderInput={params => (
                <TextField {...params} label="Pokémon 2 (opcional)" />
              )}
            />
          </Stack>

          {slot1 || slot2 ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {slot1 ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <SpriteThumb slug={slot1.slug} />
                      <span>{slot1.slug}</span>
                    </Stack>
                  }
                />
              ) : null}
              {slot2 ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <SpriteThumb slug={slot2.slug} />
                      <span>{slot2.slug}</span>
                    </Stack>
                  }
                />
              ) : null}
            </Stack>
          ) : null}

          {validationHint ? (
            <Typography variant="body2" color="warning.main">
              {validationHint}
            </Typography>
          ) : null}

          {save.isError ? (
            <Typography variant="body2" color="error">
              {save.error instanceof Error
                ? save.error.message
                : 'Error al guardar'}
            </Typography>
          ) : null}

          <Button
            variant="contained"
            size="large"
            disabled={speciesLoading || save.isPending}
            onClick={handleSave}
            sx={{
              alignSelf: { sm: 'flex-start' },
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              boxShadow: 'none',
              '&:active': { transform: 'scale(0.98)' }
            }}
          >
            {save.isPending ? 'Guardando…' : 'Guardar deck del jugador'}
          </Button>
        </>
      )}
    </Stack>
  )
}
