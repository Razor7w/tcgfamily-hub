'use client'

import { useEffect, useMemo, useState } from 'react'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
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
import type { DecklistVariantDTO } from '@/components/decklist/DecklistVariantsPanel'

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
  const [loadingDownload, setLoadingDownload] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (principalVariantId && variants.some(v => v.id === principalVariantId)) {
      setListKind('variant')
      setVariantId(principalVariantId)
    } else {
      setListKind('base')
      setVariantId(null)
    }
  }, [open, principalVariantId, variants])

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

  const handleGenerate = async () => {
    setError(null)
    setLoadingDownload(true)
    try {
      const res = await fetch(
        `/api/decklists/${encodeURIComponent(decklistId)}/play-pokemon-pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: playerName.trim(),
            playerId: playerId.trim(),
            dateOfBirth,
            ageDivision,
            listKind,
            variantId: listKind === 'variant' ? variantId : null
          })
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
      onClose={() => !loadingDownload && onClose()}
      fullWidth
      maxWidth="sm"
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
          {error ? (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={() => onClose()} disabled={loadingDownload}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          disabled={!canSubmit || loadingDownload}
          onClick={() => void handleGenerate()}
          sx={{ fontWeight: 700 }}
        >
          {loadingDownload ? 'Generando…' : 'Descargar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
