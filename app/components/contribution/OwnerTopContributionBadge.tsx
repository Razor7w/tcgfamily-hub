'use client'

import { useState, type MouseEvent } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { Storefront, WorkspacePremium } from '@mui/icons-material'
import ContributionTierBadge from '@/components/contribution/ContributionTierBadge'

export type OwnerTopContributionBadgeData = {
  label: string
  storeName: string
  storeSlug: string
  totalPoints: number
  monthPoints: number
  monthLabel: string
}

type OwnerTopContributionBadgeProps = {
  badge: OwnerTopContributionBadgeData
  /** Evita navegar al decklist al pulsar el badge dentro de un Link. */
  stopParentNavigation?: boolean
}

export default function OwnerTopContributionBadge({
  badge,
  stopParentNavigation = false
}: OwnerTopContributionBadgeProps) {
  const [open, setOpen] = useState(false)

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
        aria-label={`Contribución en ${badge.storeName}: ${badge.label}. Ver detalle`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          maxWidth: '100%',
          p: 0,
          border: 0,
          bgcolor: 'transparent',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <ContributionTierBadge label={badge.label} />
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: { xs: 120, sm: 180 }
          }}
        >
          · {badge.storeName}
        </Typography>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkspacePremium color="secondary" fontSize="small" />
          Contribución en tienda
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: theme =>
                  alpha(
                    theme.palette.secondary.main,
                    theme.palette.mode === 'dark' ? 0.14 : 0.08
                  ),
                border: '1px solid',
                borderColor: theme => alpha(theme.palette.secondary.main, 0.2)
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Storefront fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={800}>
                  {badge.storeName}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                Nivel en esta tienda
              </Typography>
              <ContributionTierBadge label={badge.label} size="medium" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Total acumulado:{' '}
              <Box
                component="strong"
                sx={{
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {badge.totalPoints.toLocaleString('es-CL')} pts
              </Box>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Este mes ({badge.monthLabel}):{' '}
              <Box
                component="strong"
                sx={{
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {badge.monthPoints.toLocaleString('es-CL')} pts
              </Box>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Es la tienda donde esta persona más puntos de contribución ha
              sumado (reputación histórica; el ranking mensual es aparte).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
          <Button
            component={Link}
            href={`/${encodeURIComponent(badge.storeSlug)}`}
            variant="contained"
            color="secondary"
            onClick={() => setOpen(false)}
          >
            Ver tienda
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
