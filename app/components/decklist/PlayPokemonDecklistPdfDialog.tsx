'use client'

import { useEffect, useMemo, useState } from 'react'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Box from '@mui/material/Box'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { DecklistVariantDTO } from '@/components/decklist/DecklistVariantsPanel'

const PDF_CALIB_STORAGE_KEY = 'tcgfamily:playPokemonPdfCalibration'

function loadStoredOffsets(): { offsetX: number; offsetY: number } {
  if (typeof window === 'undefined') return { offsetX: 0, offsetY: 0 }
  try {
    const raw = localStorage.getItem(PDF_CALIB_STORAGE_KEY)
    if (!raw) return { offsetX: 0, offsetY: 0 }
    const j = JSON.parse(raw) as { offsetX?: unknown; offsetY?: unknown }
    const clamp = (n: number) => Math.max(-400, Math.min(400, n))
    const ox =
      typeof j.offsetX === 'number' && Number.isFinite(j.offsetX)
        ? clamp(j.offsetX)
        : 0
    const oy =
      typeof j.offsetY === 'number' && Number.isFinite(j.offsetY)
        ? clamp(j.offsetY)
        : 0
    return { offsetX: ox, offsetY: oy }
  } catch {
    return { offsetX: 0, offsetY: 0 }
  }
}

export type AgeDivisionChoice = 'junior' | 'senior' | 'masters'

type Props = {
  open: boolean
  onClose: () => void
  decklistId: string
  decklistName: string
  principalVariantId: string | null
  variants: DecklistVariantDTO[]
}

export default function PlayPokemonDecklistPdfDialog({
  open,
  onClose,
  decklistId,
  decklistName,
  principalVariantId,
  variants
}: Props) {
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [ageDivision, setAgeDivision] = useState<AgeDivisionChoice>('masters')
  const [listKind, setListKind] = useState<'base' | 'variant'>('base')
  const [variantId, setVariantId] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingDownload, setLoadingDownload] = useState(false)
  const busy = loadingPreview || loadingDownload
  const [error, setError] = useState<string | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const listOptions = useMemo(() => {
    const out: { key: string; label: string; kind: 'base' | 'variant' }[] = [
      { key: 'base', label: 'Listado base', kind: 'base' }
    ]
    for (const v of variants) {
      out.push({
        key: `v:${v.id}`,
        label: v.label,
        kind: 'variant'
      })
    }
    return out
  }, [variants])

  const selectedListKey = useMemo(() => {
    if (listKind === 'base') return 'base'
    return variantId ? `v:${variantId}` : 'base'
  }, [listKind, variantId])

  useEffect(() => {
    if (!open) return
    setError(null)
    setPlayerName('')
    setPlayerId('')
    setDateOfBirth('')
    setAgeDivision('masters')
    const cal = loadStoredOffsets()
    setOffsetX(cal.offsetX)
    setOffsetY(cal.offsetY)
    setPreviewUrl(u => {
      if (u) URL.revokeObjectURL(u)
      return null
    })
    if (principalVariantId && variants.some(v => v.id === principalVariantId)) {
      setListKind('variant')
      setVariantId(principalVariantId)
    } else {
      setListKind('base')
      setVariantId(null)
    }
  }, [open, principalVariantId, variants])

  useEffect(() => {
    if (!open) return
    try {
      localStorage.setItem(
        PDF_CALIB_STORAGE_KEY,
        JSON.stringify({ offsetX, offsetY })
      )
    } catch {
      /* ignore quota */
    }
  }, [open, offsetX, offsetY])

  useEffect(() => {
    if (open) return
    setPreviewUrl(u => {
      if (u) URL.revokeObjectURL(u)
      return null
    })
  }, [open])

  const handleListChange = (key: string) => {
    if (key === 'base') {
      setListKind('base')
      setVariantId(null)
      return
    }
    const id = key.startsWith('v:') ? key.slice(2) : ''
    if (!id) return
    setListKind('variant')
    setVariantId(id)
  }

  console.log('offsetX', offsetX)
  console.log('offsetY', offsetY)

  const buildRequestBody = () =>
    JSON.stringify({
      playerName: playerName.trim(),
      playerId: playerId.trim(),
      dateOfBirth,
      ageDivision,
      listKind,
      variantId: listKind === 'variant' ? variantId : null,
      offsetX,
      offsetY
    })

  const handlePreview = async () => {
    setError(null)
    setLoadingPreview(true)
    try {
      const res = await fetch(
        `/api/decklists/${encodeURIComponent(decklistId)}/play-pokemon-pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: buildRequestBody()
        }
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al generar PDF'
        )
      }
      const blob = await res.blob()
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar PDF')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleGenerate = async () => {
    setError(null)
    setLoadingDownload(true)
    try {
      const res = await fetch(
        `/api/decklists/${encodeURIComponent(decklistId)}/play-pokemon-pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: buildRequestBody()
        }
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al generar PDF'
        )
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `play-pokemon-${decklistName.replace(/[^\w\-]+/g, '_').slice(0, 40)}.pdf`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar PDF')
    } finally {
      setLoadingDownload(false)
    }
  }

  const canSubmit =
    playerName.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
    (listKind === 'base' || (listKind === 'variant' && Boolean(variantId)))

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
        PDF para torneo (Play! Pokémon)
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Completa tus datos como en la hoja oficial. El listado se toma del
            mazo «{decklistName}».
          </Typography>
          <TextField
            label="Nombre del jugador"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            required
            fullWidth
            autoComplete="name"
          />
          <TextField
            label="Player ID"
            value={playerId}
            onChange={e => setPlayerId(e.target.value)}
            fullWidth
            placeholder="POP ID u otro identificador"
            helperText="Opcional si tu torneo no lo exige en el PDF."
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
          <FormControl fullWidth size="small">
            <InputLabel id="pdf-list-label">Listado a incluir</InputLabel>
            <Select
              labelId="pdf-list-label"
              label="Listado a incluir"
              value={selectedListKey}
              onChange={e => handleListChange(String(e.target.value))}
            >
              {listOptions.map(o => (
                <MenuItem key={o.key} value={o.key}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Accordion
            disableGutters
            elevation={0}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight={700}>
                Ajuste fino (calibración)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5}>
                <Typography variant="caption" color="text.secondary">
                  Desplaza todo el texto respecto a la plantilla (pt, rango
                  ±400). Los valores se guardan en este navegador. Cuando
                  encajen, copia los números a{' '}
                  <Typography
                    component="span"
                    variant="caption"
                    fontFamily="monospace"
                  >
                    app/lib/play-pokemon-pdf-calibration.ts
                  </Typography>{' '}
                  como valores por defecto.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Offset X (pt)"
                    type="number"
                    size="small"
                    fullWidth
                    value={offsetX}
                    onChange={e => setOffsetX(Number(e.target.value))}
                    inputProps={{ step: 0.5, min: -400, max: 400 }}
                  />
                  <TextField
                    label="Offset Y (pt)"
                    type="number"
                    size="small"
                    fullWidth
                    value={offsetY}
                    onChange={e => setOffsetY(Number(e.target.value))}
                    inputProps={{ step: 0.5, min: -400, max: 400 }}
                  />
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
          {previewUrl ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Vista previa
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Si no ves el PDF embebido, usa el botón de descarga o abre el
                archivo en otra pestaña tras generarlo.
              </Typography>
              <Box
                component="iframe"
                title="Vista previa PDF Play! Pokémon"
                src={previewUrl}
                sx={{
                  width: '100%',
                  height: { xs: 360, sm: 480 },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'grey.100'
                }}
              />
            </Stack>
          ) : null}
          {error ? (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          pb: 2,
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}
      >
        <Button onClick={() => onClose()} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          disabled={!canSubmit || busy}
          onClick={() => void handlePreview()}
        >
          {loadingPreview ? 'Generando…' : 'Vista previa'}
        </Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          disabled={!canSubmit || busy}
          onClick={() => void handleGenerate()}
          sx={{ fontWeight: 700 }}
        >
          {loadingDownload ? 'Generando…' : 'Descargar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
