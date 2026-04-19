'use client'

import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import {
  type PublicWeeklyEvent,
  useRegisterWeeklyEvent
} from '@/hooks/useWeeklyEvents'

type RegisterMutation = ReturnType<typeof useRegisterWeeklyEvent>

export default function WeeklyEventPreRegisterForm({
  selectedEvent,
  defaultName,
  popId,
  regReason,
  register
}: {
  selectedEvent: PublicWeeklyEvent
  defaultName: string
  popId: string
  regReason: string | null
  register: RegisterMutation
}) {
  const [nameInput, setNameInput] = useState(defaultName)
  const canSubmit =
    !regReason &&
    nameInput.trim().length > 0 &&
    !register.isPending &&
    !!selectedEvent

  return (
    <Stack spacing={2} component="form" noValidate>
      <TextField
        label="Nombre en la lista"
        placeholder="Ej. Ana o tu apodo"
        value={nameInput}
        onChange={e => setNameInput(e.target.value)}
        fullWidth
        size="medium"
        disabled={!selectedEvent.canPreRegister}
        helperText={
          !selectedEvent.canPreRegister
            ? 'Preinscripción cerrada para este horario'
            : undefined
        }
      />
      <Button
        type="button"
        variant="contained"
        size="large"
        fullWidth
        disabled={!canSubmit}
        onClick={async () => {
          if (!selectedEvent) return
          try {
            await register.mutateAsync({
              eventId: selectedEvent._id,
              displayName: nameInput.trim(),
              popId: popId.trim(),
              table: '',
              opponentId: ''
            })
          } catch {
            /* error en estado */
          }
        }}
      >
        {register.isPending ? 'Enviando…' : 'Preinscribirme'}
      </Button>
      {register.isError ? (
        <Alert severity="error" variant="outlined">
          {register.error instanceof Error ? register.error.message : 'Error'}
        </Alert>
      ) : null}
    </Stack>
  )
}
