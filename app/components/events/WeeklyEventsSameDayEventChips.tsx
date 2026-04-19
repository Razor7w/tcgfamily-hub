'use client'

import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import type { PublicWeeklyEvent } from '@/hooks/useWeeklyEvents'

export default function WeeklyEventsSameDayEventChips({
  eventsForDay,
  selectedEventId,
  onSelectEventId
}: {
  eventsForDay: PublicWeeklyEvent[]
  selectedEventId: string | null
  onSelectEventId: (id: string) => void
}) {
  if (eventsForDay.length <= 1) return null

  return (
    <Stack
      direction="row"
      role="tablist"
      aria-label="Eventos del día"
      gap={1}
      flexWrap="wrap"
      sx={{ mb: 2.5 }}
    >
      {eventsForDay.map(ev => {
        const active = ev._id === selectedEventId
        return (
          <Chip
            key={ev._id}
            label={ev.title}
            onClick={() => onSelectEventId(ev._id)}
            color={active ? 'primary' : 'default'}
            variant={active ? 'filled' : 'outlined'}
            sx={{
              fontWeight: active ? 700 : 600,
              borderRadius: 2,
              borderColor: active
                ? undefined
                : t => alpha(t.palette.text.primary, 0.14),
              transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:active': { transform: 'scale(0.98)' }
            }}
          />
        )
      })}
    </Stack>
  )
}
