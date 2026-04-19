'use client'

import { useMemo } from 'react'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { addWeeks, startOfWeekMonday } from '@/components/events/weekUtils'

type WeekAnchorToolbarProps = {
  weekAnchor: Date
  onWeekAnchorChange: (next: Date) => void
}

/**
 * Selector de semana (mismo patrón que la vista de eventos).
 */
export default function WeekAnchorToolbar({
  weekAnchor,
  onWeekAnchorChange
}: WeekAnchorToolbarProps) {
  const weekStart = useMemo(() => startOfWeekMonday(weekAnchor), [weekAnchor])

  const handlePrevWeek = () => {
    onWeekAnchorChange(addWeeks(startOfWeekMonday(weekAnchor), -1))
  }

  const handleNextWeek = () => {
    onWeekAnchorChange(addWeeks(startOfWeekMonday(weekAnchor), 1))
  }

  const rangeLabel = useMemo(() => {
    const start = weekStart.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short'
    })
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    const endStr = end.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    return `${start} — ${endStr}`
  }, [weekStart])

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.75,
        mb: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.08),
        bgcolor: t => alpha(t.palette.text.primary, 0.02)
      }}
    >
      <IconButton
        size="medium"
        aria-label="Semana anterior"
        onClick={handlePrevWeek}
        sx={{
          color: 'text.secondary',
          p: { xs: 1, sm: 0.75 },
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
        {rangeLabel}
      </Typography>
      <IconButton
        size="medium"
        aria-label="Semana siguiente"
        onClick={handleNextWeek}
        sx={{
          color: 'text.secondary',
          p: { xs: 1, sm: 0.75 },
          '&:hover': { bgcolor: t => alpha(t.palette.primary.main, 0.06) }
        }}
      >
        <ChevronRight />
      </IconButton>
    </Paper>
  )
}
