'use client'

import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import ChevronRight from '@mui/icons-material/ChevronRight'
import MarkunreadMailbox from '@mui/icons-material/MarkunreadMailbox'
import PictureAsPdf from '@mui/icons-material/PictureAsPdf'
import SportsEsports from '@mui/icons-material/SportsEsports'
import type { DashboardShortcutsVisibility } from '@/lib/dashboard-module-config'

type DashboardQuickActionsProps = {
  shortcuts: DashboardShortcutsVisibility
  onRegisterMail: () => void
  onCreateCustomTournament: () => void
  onPlayPokemonDecklistPdf: () => void
}

function ActionTile({
  icon,
  title,
  description,
  onClick
}: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  const ariaLabel = `${title}. ${description}`

  return (
    <ButtonBase
      focusRipple
      onClick={onClick}
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'left',
        borderRadius: 2,
        overflow: 'hidden',
        transition:
          'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s ease, border-color 0.18s ease',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: t =>
          alpha(
            t.palette.primary.main,
            t.palette.mode === 'dark' ? 0.14 : 0.07
          ),
        boxShadow: 'none',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: t =>
            alpha(
              t.palette.primary.main,
              t.palette.mode === 'dark' ? 0.2 : 0.1
            ),
          boxShadow: t =>
            `0 10px 28px -8px ${alpha(
              t.palette.common.black,
              t.palette.mode === 'dark' ? 0.45 : 0.12
            )}`,
          transform: 'translateY(-2px)'
        },
        '&:active': {
          transform: 'translateY(0) scale(0.995)'
        },
        '&.Mui-focusVisible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2
        }
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 2 }}
        alignItems={{ xs: 'center', sm: 'flex-start' }}
        sx={{
          p: { xs: 1.25, sm: 2.25 },
          width: '100%',
          textAlign: { xs: 'center', sm: 'left' }
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: t => alpha(t.palette.primary.main, 0.14),
            border: '1px solid',
            borderColor: t => alpha(t.palette.primary.main, 0.22)
          }}
          aria-hidden
        >
          {icon}
        </Box>
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            pt: { xs: 0, sm: 0.25 },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <Typography
            variant="subtitle1"
            component="span"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.01em',
              display: 'block',
              fontSize: { xs: '0.8125rem', sm: undefined },
              lineHeight: { xs: 1.3, sm: undefined }
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: { xs: 0, sm: 0.5 },
              lineHeight: 1.45,
              display: { xs: 'none', sm: 'block' }
            }}
          >
            {description}
          </Typography>
        </Box>
        <ChevronRight
          sx={{
            display: { xs: 'none', sm: 'block' },
            flexShrink: 0,
            mt: { xs: 0, sm: 0.5 },
            color: 'text.secondary',
            opacity: 0.7,
            fontSize: 22
          }}
          aria-hidden
        />
      </Stack>
    </ButtonBase>
  )
}

export default function DashboardQuickActions({
  shortcuts,
  onRegisterMail,
  onCreateCustomTournament,
  onPlayPokemonDecklistPdf
}: DashboardQuickActionsProps) {
  if (
    !shortcuts.createMail &&
    !shortcuts.createTournament &&
    !shortcuts.playPokemonDecklistPdf
  ) {
    return null
  }

  const tileCount =
    Number(shortcuts.createMail) +
    Number(shortcuts.createTournament) +
    Number(shortcuts.playPokemonDecklistPdf)

  return (
    <Box
      component="section"
      aria-labelledby="dashboard-quick-actions-heading"
      sx={{
        borderRadius: 2,
        p: { xs: 1.25, sm: 2.5 },
        border: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.08),
        background: t =>
          t.palette.mode === 'dark'
            ? alpha(t.palette.background.paper, 0.55)
            : t.palette.background.paper,
        boxShadow: t =>
          t.palette.mode === 'dark'
            ? `inset 0 1px 0 ${alpha(t.palette.common.white, 0.06)}`
            : `inset 0 1px 0 ${alpha(t.palette.common.black, 0.04)}`
      }}
    >
      <Typography
        id="dashboard-quick-actions-heading"
        variant="overline"
        component="h2"
        color="text.secondary"
        sx={{
          fontWeight: 800,
          letterSpacing: { xs: '0.1em', sm: '0.14em' },
          display: 'block',
          mb: { xs: 0.75, sm: 0.5 },
          fontSize: { xs: '0.65rem', sm: undefined }
        }}
      >
        Accesos rápidos
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          display: { xs: 'none', sm: 'block' },
          mb: 2,
          maxWidth: 560,
          lineHeight: 1.5
        }}
      >
        Atajos para las acciones que usas con más frecuencia. El resto del panel
        sigue igual debajo.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm:
              tileCount === 1
                ? 'minmax(0, 1fr)'
                : tileCount === 2
                  ? 'repeat(2, minmax(0, 1fr))'
                  : 'repeat(3, minmax(0, 1fr))'
          },
          gap: { xs: 1, sm: 2 }
        }}
      >
        {shortcuts.createMail ? (
          <ActionTile
            icon={<MarkunreadMailbox sx={{ fontSize: { xs: 22, sm: 26 } }} />}
            title="Registrar correo"
            description="Añade un envío a la tienda."
            onClick={onRegisterMail}
          />
        ) : null}
        {shortcuts.createTournament ? (
          <ActionTile
            icon={<SportsEsports sx={{ fontSize: { xs: 22, sm: 26 } }} />}
            title="Reportar torneo"
            description="Registra un torneo personal."
            onClick={onCreateCustomTournament}
          />
        ) : null}
        {shortcuts.playPokemonDecklistPdf ? (
          <ActionTile
            icon={<PictureAsPdf sx={{ fontSize: { xs: 22, sm: 26 } }} />}
            title="PDF de listas"
            description="Hoja oficial Play! Pokémon (PDF)."
            onClick={onPlayPokemonDecklistPdf}
          />
        ) : null}
      </Box>
    </Box>
  )
}
