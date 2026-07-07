'use client'

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Box from '@mui/material/Box'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import {
  SEASON_PERIOD_LABELS,
  SEASON_PERIOD_SHORT_LABELS,
  type SeasonPeriod
} from '@/lib/player-season-summary-types'

export const SEASON_PERIOD_OPTIONS: SeasonPeriod[] = [
  'month',
  'quarter',
  'year',
  'all'
]

export function buildSeasonPeriodToggleSx(compact = false): SxProps<Theme> {
  return t => ({
    gap: 0.5,
    flexWrap: 'nowrap',
    '& .MuiToggleButtonGroup-grouped': {
      border: '0 !important',
      borderRadius: '9px !important',
      margin: 0
    },
    '& .MuiToggleButton-root': {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: compact ? { xs: '0.8125rem', sm: '0.875rem' } : '0.875rem',
      lineHeight: 1.25,
      px: compact ? { xs: 1.1, sm: 2 } : { xs: 1.5, sm: 2 },
      py: compact ? 0.75 : 0.9,
      whiteSpace: 'nowrap',
      color: 'text.secondary',
      border: '0',
      transition:
        'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
      '&.Mui-selected': {
        bgcolor: 'background.paper',
        color: 'primary.dark',
        fontWeight: 700,
        boxShadow: `0 1px 2px ${alpha(t.palette.common.black, 0.06)}, 0 6px 16px ${alpha(t.palette.primary.main, 0.14)}`,
        '&:hover': {
          bgcolor: 'background.paper'
        }
      },
      '&:hover': {
        bgcolor: alpha(t.palette.primary.main, 0.07),
        color: 'text.primary'
      },
      '&:active': {
        transform: 'translateY(1px) scale(0.99)'
      },
      '&:focus-visible': {
        outline: '2px solid',
        outlineColor: 'primary.main',
        outlineOffset: 2
      }
    }
  })
}

/** @deprecated Usar buildSeasonPeriodToggleSx */
export const seasonPeriodToggleSx: SxProps<Theme> = buildSeasonPeriodToggleSx()

type SeasonPeriodFilterProps = {
  value: SeasonPeriod
  onChange: (period: SeasonPeriod) => void
  size?: 'small' | 'medium'
  fullWidth?: boolean
  /** Etiquetas cortas en viewport estrecho. */
  compact?: boolean
}

export default function SeasonPeriodFilter({
  value,
  onChange,
  size = 'small',
  fullWidth,
  compact = false
}: SeasonPeriodFilterProps) {
  return (
    <Box
      sx={t => ({
        p: 0.5,
        borderRadius: 2.5,
        bgcolor: alpha(t.palette.primary.main, 0.06),
        border: '1px solid',
        borderColor: alpha(t.palette.primary.main, 0.12),
        overflowX: 'auto',
        flexWrap: { xs: 'nowrap', sm: 'wrap' },
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none'
      })}
    >
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, next: SeasonPeriod | null) => {
          if (next) onChange(next)
        }}
        size={size}
        fullWidth={fullWidth}
        sx={buildSeasonPeriodToggleSx(compact)}
      >
        {SEASON_PERIOD_OPTIONS.map(option => (
          <ToggleButton key={option} value={option}>
            {compact ? (
              <>
                <Box
                  component="span"
                  sx={{ display: { xs: 'inline', sm: 'none' } }}
                >
                  {SEASON_PERIOD_SHORT_LABELS[option]}
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: 'none', sm: 'inline' } }}
                >
                  {SEASON_PERIOD_LABELS[option]}
                </Box>
              </>
            ) : (
              SEASON_PERIOD_LABELS[option]
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}
