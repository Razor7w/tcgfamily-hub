'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Stack, TextField } from '@mui/material'
import {
  DEFAULT_TOURNAMENT_POINTS_DISPLAY_NAME,
  resolveTournamentPointsDisplayName
} from '@/lib/store-credit-admin-settings'

type TournamentPointsDisplayNameEditorProps = {
  initialCustomName: string
  onLabelChange?: (label: string) => void
}

export default function TournamentPointsDisplayNameEditor({
  initialCustomName,
  onLabelChange
}: TournamentPointsDisplayNameEditorProps) {
  const router = useRouter()
  const [customName, setCustomName] = useState(initialCustomName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setCustomName(initialCustomName)
  }, [initialCustomName])

  useEffect(() => {
    onLabelChange?.(resolveTournamentPointsDisplayName(customName))
  }, [customName, onLabelChange])

  const dirty =
    normalizeForCompare(customName) !== normalizeForCompare(initialCustomName)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/tournament-points/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentPointsCustomName: customName })
      })
      const data = (await res.json()) as {
        error?: string
        tournamentPointsLabel?: string
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al guardar'
        )
      }
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2, maxWidth: 480 }}>
      <TextField
        size="small"
        label="¿Cómo quieres que se llamen tus puntos?"
        placeholder={DEFAULT_TOURNAMENT_POINTS_DISPLAY_NAME}
        value={customName}
        onChange={e => {
          setSaved(false)
          setCustomName(e.target.value)
        }}
        helperText={`Se muestra aquí y en la vista del jugador. Si lo dejas vacío: «${DEFAULT_TOURNAMENT_POINTS_DISPLAY_NAME}».`}
        inputProps={{ maxLength: 60 }}
        fullWidth
      />
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="contained"
          size="small"
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Guardando…' : 'Guardar nombre'}
        </Button>
        {saved && !dirty ? (
          <Alert severity="success" sx={{ py: 0, px: 1 }}>
            Guardado
          </Alert>
        ) : null}
      </Stack>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
    </Stack>
  )
}

function normalizeForCompare(value: string): string {
  return value.trim()
}
