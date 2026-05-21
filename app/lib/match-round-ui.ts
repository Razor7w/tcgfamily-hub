import { alpha } from '@mui/material/styles'
import { roundTableOutcome } from '@/lib/participant-match-round'

export const MATCH_WIN_COLOR = '#15803d'
export const MATCH_LOSS_COLOR = '#dc2626'
export const MATCH_TIE_COLOR = '#ca8a04'

export type MatchRowOutcome = ReturnType<typeof roundTableOutcome>

export function matchRowAccentParts(outcome: MatchRowOutcome): {
  bgcolor: string
  borderLeftColor: string
} {
  if (outcome === 'win') {
    return {
      bgcolor: alpha(MATCH_WIN_COLOR, 0.12),
      borderLeftColor: MATCH_WIN_COLOR
    }
  }
  if (outcome === 'loss') {
    return {
      bgcolor: alpha(MATCH_LOSS_COLOR, 0.1),
      borderLeftColor: MATCH_LOSS_COLOR
    }
  }
  if (outcome === 'tie') {
    return {
      bgcolor: alpha(MATCH_TIE_COLOR, 0.14),
      borderLeftColor: MATCH_TIE_COLOR
    }
  }
  return {
    bgcolor: 'transparent',
    borderLeftColor: 'divider'
  }
}

export function matchResultPillSx(outcome: MatchRowOutcome) {
  if (outcome === 'win') {
    return {
      color: MATCH_WIN_COLOR,
      bgcolor: alpha(MATCH_WIN_COLOR, 0.14),
      border: `1px solid ${alpha(MATCH_WIN_COLOR, 0.35)}`
    }
  }
  if (outcome === 'loss') {
    return {
      color: MATCH_LOSS_COLOR,
      bgcolor: alpha(MATCH_LOSS_COLOR, 0.12),
      border: `1px solid ${alpha(MATCH_LOSS_COLOR, 0.32)}`
    }
  }
  if (outcome === 'tie') {
    return {
      color: MATCH_TIE_COLOR,
      bgcolor: alpha(MATCH_TIE_COLOR, 0.14),
      border: `1px solid ${alpha(MATCH_TIE_COLOR, 0.35)}`
    }
  }
  return {
    color: 'text.secondary',
    bgcolor: alpha('#64748b', 0.08),
    border: '1px solid',
    borderColor: 'divider'
  }
}
