'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { EventAvailable } from '@mui/icons-material'
import type { PublicWeeklyEvent } from '@/hooks/useWeeklyEvents'
import { formatWhen } from '@/components/events/weeklyEventsSectionUtils'
import { localDayKey } from '@/components/events/weekUtils'

export default function WeeklyEventsOtherDaysEmptyPanel({
  eventsWeekSorted,
  weekStart,
  onPickEvent
}: {
  eventsWeekSorted: PublicWeeklyEvent[]
  weekStart: Date
  onPickEvent: (dayOffset: number, eventId: string) => void
}) {
  return (
    <Stack
      alignItems="stretch"
      spacing={1.5}
      sx={{
        py: 3,
        px: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px dashed',
        borderColor: t => alpha(t.palette.text.primary, 0.12),
        bgcolor: t => alpha(t.palette.text.primary, 0.02)
      }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1.5}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            flexShrink: 0,
            bgcolor: t => alpha(t.palette.text.primary, 0.06),
            color: 'text.secondary'
          }}
        >
          <EventAvailable sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            color="text.primary"
            fontWeight={700}
            sx={{ letterSpacing: '-0.02em' }}
          >
            No hay eventos este día
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.35, maxWidth: 480 }}
          >
            Esta semana hay otros eventos (incluidos los que ya pasaron). Toca
            uno para ver el detalle o elige ese día en la fila superior.
          </Typography>
        </Box>
      </Stack>
      <Stack spacing={1} sx={{ pl: { xs: 0, sm: 0 }, pt: 0.5 }}>
        {eventsWeekSorted.map(ev => {
          const k = localDayKey(new Date(ev.startsAt))
          let dayOffset = 0
          for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart)
            d.setDate(weekStart.getDate() + i)
            if (localDayKey(d) === k) {
              dayOffset = i
              break
            }
          }
          return (
            <Button
              key={ev._id}
              type="button"
              variant="outlined"
              color="primary"
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                py: 1.25
              }}
              onClick={() => onPickEvent(dayOffset, ev._id)}
            >
              <Box component="span" sx={{ width: '100%' }}>
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={700}
                  display="block"
                >
                  {formatWhen(ev.startsAt)}
                </Typography>
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25 }}
                >
                  {ev.title}
                </Typography>
              </Box>
            </Button>
          )
        })}
      </Stack>
    </Stack>
  )
}
