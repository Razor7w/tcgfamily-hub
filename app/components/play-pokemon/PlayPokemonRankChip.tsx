'use client'

import { useState, type MouseEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined'
import PlayPokemonPointsLabel from '@/components/play-pokemon/PlayPokemonPointsLabel'

export type PlayPokemonRankChipData = {
  rank: number
  championshipPoints: number
  playPoints?: number
  divisionLabel?: string
  seasonLabel?: string
  linkedDisplayName?: string
}

type PlayPokemonRankChipProps = {
  data: PlayPokemonRankChipData
  size?: 'small' | 'medium'
  stopParentNavigation?: boolean
}

export default function PlayPokemonRankChip({
  data,
  size = 'small',
  stopParentNavigation = false
}: PlayPokemonRankChipProps) {
  const [open, setOpen] = useState(false)
  const rankLabel = `#${data.rank.toLocaleString('es-CL')}`

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (stopParentNavigation) {
      event.preventDefault()
      event.stopPropagation()
    }
    setOpen(true)
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        aria-label={`Ranking Play! Pokémon ${rankLabel}. Ver Championship Points`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          p: 0,
          border: 0,
          bgcolor: 'transparent',
          cursor: 'pointer',
          verticalAlign: 'middle'
        }}
      >
        <Chip
          icon={
            <EmojiEventsOutlined
              sx={{ fontSize: size === 'small' ? 14 : 16 }}
            />
          }
          label={rankLabel}
          size={size}
          color="primary"
          variant="outlined"
          sx={theme => ({
            height: size === 'small' ? 22 : 26,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            fontSize: size === 'small' ? '0.65rem' : '0.75rem',
            borderColor: alpha(theme.palette.primary.main, 0.45),
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            '& .MuiChip-icon': {
              color: theme.palette.primary.main,
              ml: 0.5
            }
          })}
        />
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsOutlined color="primary" fontSize="small" />
          <PlayPokemonPointsLabel
            kind="championship"
            label="Championship Points"
            iconSize={16}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: theme =>
                  alpha(
                    theme.palette.primary.main,
                    theme.palette.mode === 'dark' ? 0.14 : 0.08
                  ),
                border: '1px solid',
                borderColor: theme => alpha(theme.palette.primary.main, 0.2)
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.05
                }}
              >
                {data.championshipPoints.toLocaleString('es-CL')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {rankLabel}
                {data.divisionLabel ? ` · ${data.divisionLabel}` : ''}
                {' · CL'}
              </Typography>
            </Box>
            {typeof data.playPoints === 'number' ? (
              <Typography variant="body2" color="text.secondary">
                <PlayPokemonPointsLabel kind="play" label="Play! Points" />:{' '}
                <Box
                  component="strong"
                  sx={{
                    color: 'text.primary',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {data.playPoints.toLocaleString('es-CL')}
                </Box>
              </Typography>
            ) : null}
            {data.seasonLabel ? (
              <Typography variant="body2" color="text.secondary">
                Temporada {data.seasonLabel}
              </Typography>
            ) : null}
            {data.linkedDisplayName ? (
              <Typography variant="caption" color="text.secondary">
                Vinculado como {data.linkedDisplayName}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
