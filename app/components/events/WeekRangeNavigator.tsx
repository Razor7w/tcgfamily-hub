'use client'

import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { addWeeks, startOfWeekMonday } from '@/components/events/weekUtils'

export type WeekRangeNavigatorProps = {
  weekAnchor: Date
  onWeekAnchorChange: (next: Date) => void
}

/**
 * Barra tipo píldora: semana anterior / rango lun–dom / semana siguiente (calendario local).
 */
export default function WeekRangeNavigator({
  weekAnchor,
  onWeekAnchorChange
}: WeekRangeNavigatorProps) {
  const weekStart = startOfWeekMonday(weekAnchor)

  const handlePrevWeek = () => {
    onWeekAnchorChange(addWeeks(weekStart, -1))
  }

  const handleNextWeek = () => {
    onWeekAnchorChange(addWeeks(weekStart, 1))
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.75,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.08),
        bgcolor: t => alpha(t.palette.text.primary, 0.02)
      }}
    >
      <IconButton
        size="small"
        aria-label="Semana anterior"
        onClick={handlePrevWeek}
        sx={{
          color: 'text.secondary',
          '&:hover': { bgcolor: t => alpha(t.palette.primary.main, 0.06) }
        }}
      >
        <ChevronLeft />
      </IconButton>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          flex: 1,
          textAlign: 'center',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {weekStart.toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'short'
        })}{' '}
        —{' '}
        {(() => {
          const end = new Date(weekStart)
          end.setDate(weekStart.getDate() + 6)
          return end.toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        })()}
      </Typography>
      <IconButton
        size="small"
        aria-label="Semana siguiente"
        onClick={handleNextWeek}
        sx={{
          color: 'text.secondary',
          '&:hover': { bgcolor: t => alpha(t.palette.primary.main, 0.06) }
        }}
      >
        <ChevronRight />
      </IconButton>
    </Paper>
  )
}
