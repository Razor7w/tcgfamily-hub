'use client'

import type { MutableRefObject, RefObject } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { WEEKDAY_SHORT } from '@/components/events/weeklyEventsSectionUtils'
import { localDayKey } from '@/components/events/weekUtils'

export default function WeeklyEventsDayStrip({
  stripRef,
  dayPickerButtonRefs,
  dayKeys,
  weekStart,
  selectedOffset,
  onSelectOffset,
  countsByDay
}: {
  stripRef: RefObject<HTMLDivElement | null>
  dayPickerButtonRefs: MutableRefObject<(HTMLButtonElement | null)[]>
  dayKeys: string[]
  weekStart: Date
  selectedOffset: number
  onSelectOffset: (idx: number) => void
  countsByDay: Map<string, number>
}) {
  return (
    <Box
      ref={stripRef}
      component="nav"
      aria-label="Días de la semana"
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        pb: 1.5,
        mx: { xs: -0.5, sm: 0 },
        px: 0.5,
        scrollSnapType: 'x proximity',
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: 3,
          bgcolor: t => alpha(t.palette.text.primary, 0.15)
        }
      }}
    >
      {dayKeys.map((key, idx) => {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + idx)
        const count = countsByDay.get(key) ?? 0
        const selected = idx === selectedOffset
        const isToday = key === localDayKey(new Date())
        return (
          <Button
            key={key}
            ref={el => {
              dayPickerButtonRefs.current[idx] = el
            }}
            onClick={() => onSelectOffset(idx)}
            variant={selected ? 'contained' : 'outlined'}
            color={selected ? 'primary' : 'inherit'}
            size="small"
            aria-pressed={selected}
            aria-current={selected ? 'date' : undefined}
            sx={{
              minWidth: 58,
              flexShrink: 0,
              scrollSnapAlign: 'start',
              py: 1.35,
              flexDirection: 'column',
              lineHeight: 1.2,
              borderRadius: 2.5,
              borderWidth: isToday && !selected ? 2 : 1,
              borderColor:
                isToday && !selected
                  ? t => alpha(t.palette.primary.main, 0.45)
                  : undefined,
              bgcolor: selected
                ? undefined
                : t => alpha(t.palette.background.paper, 0.8),
              transition:
                'background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: selected
                ? t => `0 8px 20px -8px ${alpha(t.palette.primary.main, 0.45)}`
                : 'none',
              '&:active': { transform: 'scale(0.98)' }
            }}
          >
            <Typography
              variant="caption"
              display="block"
              sx={{ opacity: selected ? 0.95 : 0.75, fontWeight: 600 }}
            >
              {WEEKDAY_SHORT[idx]}
            </Typography>
            <Typography
              variant="body2"
              fontWeight={800}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {d.getDate()}
            </Typography>
            {count > 0 ? (
              <Chip
                label={count}
                size="small"
                color={selected ? 'default' : 'primary'}
                variant={selected ? 'filled' : 'outlined'}
                sx={{
                  mt: 0.5,
                  height: 20,
                  '& .MuiChip-label': {
                    px: 0.75,
                    fontSize: 10,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums'
                  }
                }}
              />
            ) : null}
          </Button>
        )
      })}
    </Box>
  )
}
