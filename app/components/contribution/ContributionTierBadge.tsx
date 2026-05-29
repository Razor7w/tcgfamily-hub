'use client'

import Chip from '@mui/material/Chip'
import { WorkspacePremium } from '@mui/icons-material'
import { alpha } from '@mui/material/styles'

type ContributionTierBadgeProps = {
  label: string
  size?: 'small' | 'medium'
}

export default function ContributionTierBadge({
  label,
  size = 'small'
}: ContributionTierBadgeProps) {
  return (
    <Chip
      icon={<WorkspacePremium sx={{ fontSize: size === 'small' ? 14 : 16 }} />}
      label={label}
      size={size}
      color="secondary"
      variant="outlined"
      sx={theme => ({
        height: size === 'small' ? 22 : 26,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.65rem' : '0.75rem',
        borderColor: alpha(theme.palette.secondary.main, 0.45),
        bgcolor: alpha(theme.palette.secondary.main, 0.06),
        '& .MuiChip-icon': {
          color: theme.palette.secondary.main,
          ml: 0.5
        }
      })}
    />
  )
}
