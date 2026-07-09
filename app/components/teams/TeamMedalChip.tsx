'use client'

import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import type { TeamMedalCategory, TeamMedalDTO } from '@/lib/teams/medals/types'

type TeamMedalChipProps = {
  medal: TeamMedalDTO
  size?: 'small' | 'medium'
}

function MedalCategoryIcon({
  category,
  fontSize
}: {
  category: TeamMedalCategory
  fontSize: number
}) {
  const sx = { fontSize }
  switch (category) {
    case 'competitive':
      return <EmojiEventsOutlinedIcon sx={sx} />
    case 'longevity':
      return <MilitaryTechOutlinedIcon sx={sx} />
    default:
      return <GroupsOutlinedIcon sx={sx} />
  }
}

function medalChipColor(tier: number): 'warning' | 'default' | 'primary' {
  if (tier === 1) return 'warning'
  if (tier === 2) return 'primary'
  return 'default'
}

function formatEarnedAt(iso: string | null) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium'
    }).format(new Date(iso))
  } catch {
    return null
  }
}

function medalTooltip(medal: TeamMedalDTO) {
  const lines = [medal.description]
  if (medal.metadata?.leagueName) {
    lines.push(`Liga: ${medal.metadata.leagueName}`)
  }
  if (medal.metadata?.monthLabel) {
    lines.push(`Mes: ${medal.metadata.monthLabel}`)
  }
  const earned = formatEarnedAt(medal.earnedAt)
  if (earned) {
    lines.push(
      medal.kind === 'dynamic'
        ? `Vigente · referencia ${earned}`
        : `Desde ${earned}`
    )
  }
  return lines.join('\n')
}

export default function TeamMedalChip({
  medal,
  size = 'small'
}: TeamMedalChipProps) {
  const color = medalChipColor(medal.tier)
  const iconSize = size === 'small' ? 14 : 16
  const tooltip = medalTooltip(medal)

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
      <Chip
        icon={
          <MedalCategoryIcon category={medal.category} fontSize={iconSize} />
        }
        label={medal.label}
        size={size}
        color={color}
        variant="outlined"
        sx={theme => ({
          height: size === 'small' ? 26 : 30,
          pl: size === 'small' ? 1 : 1.25,
          pr: size === 'small' ? 1.25 : 1.5,
          fontWeight: 700,
          fontSize: size === 'small' ? '0.68rem' : '0.75rem',
          borderColor: alpha(
            color === 'default'
              ? theme.palette.text.primary
              : theme.palette[color].main,
            0.4
          ),
          bgcolor: alpha(
            color === 'default'
              ? theme.palette.text.primary
              : theme.palette[color].main,
            0.06
          ),
          '& .MuiChip-icon': {
            color:
              color === 'default'
                ? theme.palette.text.secondary
                : theme.palette[color].main,
            ml: 0,
            mr: 0.5
          },
          '& .MuiChip-label': {
            pl: 0.25,
            pr: 0.25
          }
        })}
      />
    </Tooltip>
  )
}
