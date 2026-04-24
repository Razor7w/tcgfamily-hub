'use client'

import { useCallback, useState } from 'react'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SavedDecklistVariantPicker, {
  type SavedDecklistTournamentOption
} from '@/components/decklist/SavedDecklistVariantPicker'
import { startOfWeekMonday } from '@/components/events/weekUtils'
import {
  useCreateCustomTournament,
  type MyTournamentDecklistRefDTO
} from '@/hooks/useWeeklyEvents'

type ReportCustomTournamentDialogProps = {
  open: boolean
  onClose: () => void
  /** Semana seleccionada en la página: se usa para proponer fecha/hora por defecto. */
  weekAnchor: Date
  onCreated: (eventId: string) => void
}

const CATEGORY_OPTIONS = [
  { value: 0, label: 'Júnior' },
  { value: 1, label: 'Sénior' },
  { value: 2, label: 'Máster' }
]

function defaultStartsAtIsoForWeek(weekAnchor: Date): string {
  const monday = startOfWeekMonday(weekAnchor)
  const d = new Date(monday)
  d.setHours(10, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${y}-${m}-${day}T${h}:${min}`
}

type CreateCustomMutation = ReturnType<typeof useCreateCustomTournament>

type ReportCustomTournamentFormProps = {
  weekAnchor: Date
  onClose: () => void
  onCreated: (eventId: string) => void
  createTournament: CreateCustomMutation
}

/**
 * Formulario montado solo mientras el diálogo está abierto: estado inicial fresco por apertura
 * (sin useEffect al abrir).
 */
function ReportCustomTournamentForm({
  weekAnchor,
  onClose,
  onCreated,
  createTournament
}: ReportCustomTournamentFormProps) {
  const [title, setTitle] = useState('')
  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    defaultStartsAtIsoForWeek(weekAnchor)
  )
  const [categoryIndex, setCategoryIndex] = useState(2)
  const [placeStr, setPlaceStr] = useState('')
  const [placementDnf, setPlacementDnf] = useState(false)
  const [decklistPick, setDecklistPick] =
    useState<SavedDecklistTournamentOption | null>(null)

  const handleClose = useCallback(() => {
    if (!createTournament.isPending) onClose()
  }, [createTournament.isPending, onClose])

  const handleSubmit = () => {
    const t = title.trim()
    if (!t) return
    const iso = new Date(startsAtLocal)
    if (Number.isNaN(iso.getTime())) return

    let placement:
      | { categoryIndex: number; place: number | null; isDnf: boolean }
      | undefined
    if (placementDnf) {
      placement = {
        categoryIndex,
        place: null,
        isDnf: true
      }
    } else if (placeStr.trim()) {
      const n = Number.parseInt(placeStr.trim(), 10)
      if (!Number.isFinite(n) || n < 1 || n > 999) return
      placement = {
        categoryIndex,
        place: n,
        isDnf: false
      }
    }

    const tournamentDecklistRef: MyTournamentDecklistRefDTO | null =
      decklistPick
        ? {
            decklistId: decklistPick.decklistId,
            listKind: decklistPick.listKind,
            variantId: decklistPick.variantId
          }
        : null

    createTournament.mutate(
      {
        title: t,
        startsAt: iso.toISOString(),
        ...(placement ? { placement } : {}),
        ...(decklistPick
          ? {
              pokemon: [...decklistPick.pokemonSlugs],
              tournamentDecklistRef
            }
          : {})
      },
      {
        onSuccess: (data: { ok: boolean; eventId: string }) => {
          onCreated(data.eventId)
          onClose()
        }
      }
    )
  }

  const placeTrimmed = placeStr.trim()
  const placeNum = placeTrimmed ? Number.parseInt(placeTrimmed, 10) : NaN
  const placeInvalid =
    !placementDnf &&
    Boolean(placeTrimmed) &&
    (!Number.isFinite(placeNum) || placeNum < 1 || placeNum > 999)

  const canSubmit = title.trim() && !createTournament.isPending && !placeInvalid

  return (
    <>
      <DialogTitle>Reportar torneo</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Registra un torneo que no esté en el calendario de la tienda. Tu
            récord W‑L‑T se calculará con las rondas que reportes. Puedes
            indicar tu posición final.
          </Typography>
          <TextField
            label="Nombre del torneo"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label="Fecha y hora de inicio"
            type="datetime-local"
            value={startsAtLocal}
            onChange={e => setStartsAtLocal(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ style: { fontVariantNumeric: 'tabular-nums' } }}
          />

          <Divider />
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
          >
            Posición — Categoría (opcional)
          </Typography>
          <Stack spacing={2} sx={{ pl: { xs: 0, sm: 0.5 } }}>
            <FormControl fullWidth size="small">
              <InputLabel id="custom-category-label">Categoría</InputLabel>
              <Select
                labelId="custom-category-label"
                label="Categoría"
                value={categoryIndex}
                onChange={e => setCategoryIndex(Number(e.target.value))}
              >
                {CATEGORY_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={placementDnf}
                  onChange={e => {
                    setPlacementDnf(e.target.checked)
                    if (e.target.checked) setPlaceStr('')
                  }}
                />
              }
              label="DNF (no terminé clasificación)"
            />
            <TextField
              label="Puesto"
              type="number"
              value={placeStr}
              onChange={e => setPlaceStr(e.target.value)}
              fullWidth
              size="small"
              disabled={placementDnf}
              inputProps={{
                min: 1,
                max: 999,
                style: { fontVariantNumeric: 'tabular-nums' }
              }}
              error={placeInvalid}
              helperText={
                placementDnf
                  ? 'No aplica puesto numérico con DNF'
                  : placeInvalid
                    ? 'Introduce un puesto entre 1 y 999'
                    : 'Opcional. Ej.: 12 para 12º lugar'
              }
            />
          </Stack>

          <Divider />
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
          >
            Deck (opcional)
          </Typography>
          <SavedDecklistVariantPicker
            value={decklistPick}
            onChange={setDecklistPick}
            disabled={createTournament.isPending}
            helperText="Mismo criterio que en torneos oficiales: sprites del mazo. Puedes elegir el listado base o una variante."
          />

          {createTournament.isError ? (
            <Typography variant="body2" color="error">
              {createTournament.error instanceof Error
                ? createTournament.error.message
                : 'Error al crear'}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={createTournament.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Crear y abrir
        </Button>
      </DialogActions>
    </>
  )
}

/**
 * Crear torneo Pokémon personal (nombre, fecha y posición opcional) sin depender del calendario de la tienda.
 */
export default function ReportCustomTournamentDialog({
  open,
  onClose,
  weekAnchor,
  onCreated
}: ReportCustomTournamentDialogProps) {
  const createTournament = useCreateCustomTournament()

  const handleClose = useCallback(() => {
    if (!createTournament.isPending) onClose()
  }, [createTournament.isPending, onClose])

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      {open ? (
        <ReportCustomTournamentForm
          key={weekAnchor.getTime()}
          weekAnchor={weekAnchor}
          onClose={onClose}
          onCreated={onCreated}
          createTournament={createTournament}
        />
      ) : null}
    </Dialog>
  )
}
