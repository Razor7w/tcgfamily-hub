'use client'

import { useState } from 'react'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useSaveMyManualPlacement } from '@/hooks/useWeeklyEvents'

const CATEGORY_OPTIONS = [
  { value: 0, label: 'Júnior' },
  { value: 1, label: 'Sénior' },
  { value: 2, label: 'Máster' }
]

type Placement = {
  categoryIndex: number
  categoryLabel: string
  place: number | null
  isDnf: boolean
}

type Props = {
  eventId: string
  placement: Placement | null | undefined
}

function summarizePlacement(p: Placement): string {
  if (p.isDnf) return `${p.categoryLabel} · DNF`
  if (p.place != null) return `${p.categoryLabel} · ${p.place}º`
  return p.categoryLabel
}

export default function CustomTournamentManualPlacementSection({
  eventId,
  placement
}: Props) {
  const save = useSaveMyManualPlacement(eventId)
  const [open, setOpen] = useState(false)
  const [categoryIndex, setCategoryIndex] = useState(2)
  const [placeStr, setPlaceStr] = useState('')
  const [placementDnf, setPlacementDnf] = useState(false)

  const seedFormFromPlacement = (p: Placement | null | undefined) => {
    if (p) {
      setCategoryIndex(p.categoryIndex)
      setPlacementDnf(p.isDnf)
      setPlaceStr(!p.isDnf && p.place != null ? String(p.place) : '')
    } else {
      setCategoryIndex(2)
      setPlacementDnf(false)
      setPlaceStr('')
    }
  }

  const placeInvalid =
    !placementDnf &&
    (!placeStr.trim() ||
      !Number.isFinite(Number.parseInt(placeStr.trim(), 10)) ||
      Number.parseInt(placeStr.trim(), 10) < 1 ||
      Number.parseInt(placeStr.trim(), 10) > 999)

  const canSave = !save.isPending && (placementDnf || !placeInvalid)

  const handleSave = () => {
    if (placementDnf) {
      save.mutate(
        {
          placement: {
            categoryIndex,
            place: null,
            isDnf: true
          }
        },
        { onSuccess: () => setOpen(false) }
      )
      return
    }
    const n = Number.parseInt(placeStr.trim(), 10)
    if (!Number.isFinite(n) || n < 1 || n > 999) return
    save.mutate(
      {
        placement: {
          categoryIndex,
          place: n,
          isDnf: false
        }
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={t => ({
          py: 1.25,
          px: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: alpha(t.palette.text.primary, 0.08),
          bgcolor: alpha(t.palette.background.paper, 0.8)
        })}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <EmojiEventsOutlined
            color="action"
            sx={{ fontSize: 20, flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              lineHeight={1.35}
            >
              Posición final
            </Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ lineHeight: 1.35 }}
            >
              {placement ? summarizePlacement(placement) : 'Sin indicar'}
            </Typography>
          </Box>
        </Stack>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            seedFormFromPlacement(placement)
            setOpen(true)
          }}
          sx={{
            flexShrink: 0,
            alignSelf: { xs: 'stretch', sm: 'center' },
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {placement ? 'Editar' : 'Indicar'}
        </Button>
      </Stack>

      <Dialog
        open={open}
        onClose={() => !save.isPending && setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Posición en el torneo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Indica categoría y puesto, o marca DNF.
            </Typography>
            <Stack spacing={2} sx={{ pl: { xs: 0, sm: 0.5 } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="edit-placement-category">Categoría</InputLabel>
                <Select
                  labelId="edit-placement-category"
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
                required={!placementDnf}
                inputProps={{
                  min: 1,
                  max: 999,
                  style: { fontVariantNumeric: 'tabular-nums' }
                }}
                helperText={
                  placementDnf
                    ? 'No aplica puesto numérico con DNF'
                    : 'Ej.: 12 para 12º lugar'
                }
              />
              {placement ? (
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  disabled={save.isPending}
                  onClick={() =>
                    save.mutate({ clear: true }, { onSuccess: () => setOpen(false) })
                  }
                  sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                >
                  Quitar mi posición
                </Button>
              ) : null}
            </Stack>
            {save.isError ? (
              <Typography variant="body2" color="error">
                {save.error instanceof Error
                  ? save.error.message
                  : 'Error al guardar'}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!canSave}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
