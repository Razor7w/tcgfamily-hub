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
  /** Si viene definido, sustituye el párrafo bajo «Accesos rápidos». */
  subtitle?: string
}

type ActionItem = {
  id: 'mail' | 'tournament' | 'pdf'
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}

function ActionTile({
  icon,
  title,
  description,
  onClick,
  dense,
  titleAttr
}: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  /** Tipografía más compacta en celdas estrechas (reservado; grilla desktop máx. 2 columnas). */
  dense: boolean
  titleAttr: string
}) {
  const ariaLabel = `${title}. ${description}`

  return (
    <ButtonBase
      focusRipple
      onClick={onClick}
      aria-label={ariaLabel}
      title={titleAttr}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'left',
        borderRadius: 2.5,
        // Sin overflow hidden: en celdas estrechas el texto de varias líneas no se corta.
        overflow: 'visible',
        minHeight: { xs: 56, sm: 64, md: 72 },
        touchAction: 'manipulation',
        transition:
          'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s ease, border-color 0.22s ease, background-color 0.22s ease',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: t =>
          alpha(
            t.palette.primary.main,
            t.palette.mode === 'dark' ? 0.12 : 0.05
          ),
        boxShadow: 'none',
        '&:hover': {
          borderColor: t => alpha(t.palette.primary.main, 0.42),
          bgcolor: t =>
            alpha(
              t.palette.primary.main,
              t.palette.mode === 'dark' ? 0.18 : 0.08
            ),
          boxShadow: t => {
            const c = t.palette.primary.main
            return `0 12px 32px -10px ${alpha(
              c,
              t.palette.mode === 'dark' ? 0.5 : 0.22
            )}`
          },
          transform: 'translateY(-1px)',
          '& [data-qa="shortcut-icon"]': {
            borderColor: t => alpha(t.palette.primary.main, 0.38),
            bgcolor: t => alpha(t.palette.primary.main, 0.16)
          }
        },
        '&:active': {
          transform: 'translateY(0) scale(0.992)',
          transitionDuration: '0.1s'
        },
        '&.Mui-focusVisible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2
        }
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-start"
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{
          p: { xs: 1.25, sm: 1.5, md: dense ? 1.75 : 2.25 },
          width: '100%',
          minHeight: 'inherit'
        }}
      >
        <Box
          data-qa="shortcut-icon"
          sx={{
            flexShrink: 0,
            width: { xs: 40, sm: 44, md: dense ? 44 : 52 },
            height: { xs: 40, sm: 44, md: dense ? 44 : 52 },
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.dark',
            bgcolor: t => alpha(t.palette.primary.main, 0.12),
            border: '1px solid',
            borderColor: t => alpha(t.palette.primary.main, 0.2),
            transition: 'background-color 0.22s ease, border-color 0.22s ease',
            '& .MuiSvgIcon-root': {
              fontSize: dense
                ? { xs: 22, sm: 24, md: 22 }
                : { xs: 22, sm: 26, md: 26 }
            }
          }}
          aria-hidden
        >
          {icon}
        </Box>
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            textAlign: 'left',
            overflowWrap: 'break-word',
            hyphens: 'none',
            pr: 0.25
          }}
        >
          <Typography
            variant="subtitle1"
            component="span"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.02em',
              display: 'block',
              textWrap: 'balance',
              fontSize: dense
                ? { xs: '0.9rem', sm: '0.95rem', md: '0.95rem' }
                : { xs: '0.9rem', sm: '0.95rem' },
              lineHeight: 1.3,
              overflow: 'visible',
              textOverflow: 'clip',
              whiteSpace: 'normal',
              overflowWrap: 'break-word',
              wordBreak: 'break-word'
            }}
          >
            {title}
          </Typography>
          <Typography
            component="span"
            color="text.secondary"
            sx={{
              mt: { xs: 0.25, sm: 0.35 },
              lineHeight: 1.45,
              fontSize: {
                xs: '0.75rem',
                sm: dense ? '0.75rem' : '0.8125rem',
                md: dense ? '0.7rem' : '0.8125rem'
              },
              fontWeight: 500,
              display: { xs: 'none', sm: '-webkit-box' },
              WebkitLineClamp: { xs: 3, sm: 2, md: dense ? 2 : 3 },
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {description}
          </Typography>
        </Box>
        <ChevronRight
          sx={{
            flexShrink: 0,
            color: 'text.secondary',
            opacity: { xs: 0.5, sm: 0.62 },
            fontSize: { xs: 20, sm: 22 }
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
  onPlayPokemonDecklistPdf,
  subtitle
}: DashboardQuickActionsProps) {
  if (
    !shortcuts.createMail &&
    !shortcuts.createTournament &&
    !shortcuts.playPokemonDecklistPdf
  ) {
    return null
  }

  const items: ActionItem[] = []
  if (shortcuts.createMail) {
    items.push({
      id: 'mail',
      title: 'Registrar correo',
      description: 'Añade un envío a la tienda.',
      icon: <MarkunreadMailbox />,
      onClick: onRegisterMail
    })
  }
  if (shortcuts.createTournament) {
    items.push({
      id: 'tournament',
      title: 'Reportar torneo',
      description: 'Registra un torneo personal.',
      icon: <SportsEsports />,
      onClick: onCreateCustomTournament
    })
  }
  if (shortcuts.playPokemonDecklistPdf) {
    items.push({
      id: 'pdf',
      title: 'Lista PDF',
      description: 'Hoja oficial Play! Pokémon.',
      icon: <PictureAsPdf />,
      onClick: onPlayPokemonDecklistPdf
    })
  }

  const tileCount = items.length

  const defaultSubtitle =
    tileCount > 1
      ? 'Atajos a lo que usas a menudo. El resto del panel sigue abajo.'
      : 'Un atajo a una acción frecuente. El resto del panel sigue abajo.'
  const bodyCopy = subtitle ?? defaultSubtitle

  return (
    <Box
      component="section"
      aria-labelledby="dashboard-quick-actions-heading"
      sx={{
        borderRadius: 2.5,
        p: { xs: 1.25, sm: 2, md: 2.5 },
        border: '1px solid',
        borderColor: t => alpha(t.palette.text.primary, 0.08),
        background: t =>
          t.palette.mode === 'dark'
            ? alpha(t.palette.background.paper, 0.55)
            : t.palette.background.paper,
        boxShadow: t =>
          t.palette.mode === 'dark'
            ? `inset 0 1px 0 ${alpha(t.palette.common.white, 0.06)}`
            : `0 1px 0 ${alpha(t.palette.common.black, 0.04)}, inset 0 1px 0 ${alpha(t.palette.common.black, 0.02)}`
      }}
    >
      <Typography
        id="dashboard-quick-actions-heading"
        variant="overline"
        component="h2"
        color="text.secondary"
        sx={{
          fontWeight: 700,
          letterSpacing: { xs: '0.12em', sm: '0.1em' },
          display: 'block',
          mb: { xs: 0.35, sm: 0.5 },
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          textTransform: 'none',
          color: 'text.primary',
          opacity: 0.85
        }}
      >
        Accesos rápidos
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          display: { xs: 'none', sm: 'block' },
          mb: { xs: 0, sm: 1.75, md: 2 },
          maxWidth: 480,
          lineHeight: 1.6,
          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
          fontWeight: 500
        }}
      >
        {bodyCopy}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          // Una columna en xs/sm; en desktop máximo 2 por fila.
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'minmax(0, 1fr)',
            md:
              tileCount === 1
                ? 'minmax(0, 1fr)'
                : 'repeat(2, minmax(0, 1fr))'
          },
          columnGap: { xs: 0, sm: 1.5, md: 2 },
          rowGap: { xs: 1, sm: 1.125, md: 2 }
        }}
      >
        {items.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              minWidth: 0,
              ...(tileCount === 3 &&
                index === 2 && {
                  gridColumn: { md: '1 / -1' }
                })
            }}
          >
            <ActionTile
              icon={item.icon}
              title={item.title}
              titleAttr={item.description}
              description={item.description}
              onClick={item.onClick}
              dense={false}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}
