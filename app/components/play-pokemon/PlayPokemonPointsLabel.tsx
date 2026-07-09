'use client'

import { useState, type MouseEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {
  PLAY_POKEMON_CHAMPIONSHIP_POINTS_TOOLTIP,
  PLAY_POKEMON_PLAY_POINTS_TOOLTIP
} from '@/lib/play-pokemon-leaderboard/points-tooltips'

type PlayPokemonPointsLabelProps = {
  kind: 'championship' | 'play'
  label: string
  align?: 'left' | 'right' | 'inherit'
  iconSize?: number
  /** Stat cells en cards móviles: sin área táctil grande, una sola línea. */
  compact?: boolean
}

export default function PlayPokemonPointsLabel({
  kind,
  label,
  align = 'inherit',
  iconSize = 14,
  compact = false
}: PlayPokemonPointsLabelProps) {
  const theme = useTheme()
  const [dialogOpen, setDialogOpen] = useState(false)
  const isCoarsePointer = useMediaQuery('(pointer: coarse)', { noSsr: true })
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const preferModal = !compact && (isCoarsePointer || isNarrow)
  const resolvedIconSize = compact ? Math.min(iconSize, 12) : iconSize

  const tooltip =
    kind === 'championship'
      ? PLAY_POKEMON_CHAMPIONSHIP_POINTS_TOOLTIP
      : PLAY_POKEMON_PLAY_POINTS_TOOLTIP

  function openDialog(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDialogOpen(true)
  }

  const infoButton = (
    <Box
      component="button"
      type="button"
      onClick={openDialog}
      aria-label={`Qué son ${label}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        p: compact ? 0 : preferModal ? 0.75 : 0.25,
        m: 0,
        border: 0,
        borderRadius: '50%',
        bgcolor: 'transparent',
        color: 'text.secondary',
        cursor: 'pointer',
        lineHeight: 0,
        minWidth: compact ? 16 : preferModal ? 36 : undefined,
        minHeight: compact ? 16 : preferModal ? 36 : undefined,
        WebkitTapHighlightColor: 'transparent',
        '&:hover': {
          color: 'primary.main',
          bgcolor: theme => theme.palette.action.hover
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2
        }
      }}
    >
      <InfoOutlinedIcon
        sx={{
          fontSize: compact
            ? resolvedIconSize
            : preferModal
              ? Math.max(resolvedIconSize, 16)
              : resolvedIconSize
        }}
      />
    </Box>
  )

  return (
    <>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? 0.2 : 0.35,
          justifyContent: align === 'right' ? 'flex-end' : undefined,
          width: align === 'right' ? '100%' : undefined,
          verticalAlign: 'middle',
          whiteSpace: compact ? 'nowrap' : undefined,
          ...(compact
            ? {
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: 'text.secondary',
                lineHeight: 1.2
              }
            : {})
        }}
      >
        {label}
        {compact || preferModal ? (
          infoButton
        ) : (
          <Tooltip
            title={tooltip}
            arrow
            placement="top"
            enterDelay={300}
            slotProps={{
              tooltip: {
                sx: { maxWidth: 320, textAlign: 'left', lineHeight: 1.45 }
              }
            }}
          >
            {infoButton}
          </Tooltip>
        )}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        onClick={e => e.stopPropagation()}
      >
        <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>{label}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.55 }}
          >
            {tooltip}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} variant="contained">
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
