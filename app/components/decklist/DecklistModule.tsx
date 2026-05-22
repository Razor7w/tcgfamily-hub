'use client'

import { useMemo } from 'react'
import { Box, Paper, Stack, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import DecklistViewActions from '@/components/decklist/DecklistViewActions'
import { parseDecklistText } from '@/lib/decklist'

export type DecklistModuleProps = {
  /** Raw decklist text in the format shown in the prompt. */
  value: string
  /** Optional title shown above the module. */
  title?: string
  /** Oculta el CTA inferior (p. ej. si ya hay «Ver como imagen» en la cabecera de la página). */
  hideImageButton?: boolean
  /** Muestra «Copiar lista» debajo de «Ver como imagen» (p. ej. listas públicas). */
  showCopyListButton?: boolean
  /** En móvil las acciones van en la cabecera del panel (listas públicas). */
  mobileActionsInHeader?: boolean
}

function SectionCard({
  title,
  totalLabel,
  lines
}: {
  title: string
  totalLabel: string
  lines: { count: number; name: string; set: string; number: number }[]
}) {
  const theme = useTheme()
  return (
    <Paper
      elevation={0}
      sx={{
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: `0 14px 32px -20px ${alpha(theme.palette.mode === 'dark' ? '#000000' : theme.palette.primary.dark, theme.palette.mode === 'dark' ? 0.5 : 0.14)}`
      }}
    >
      <Box
        sx={{
          px: 1.75,
          py: 1.1,
          background: `linear-gradient(115deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 92%)`,
          color: theme.palette.primary.contrastText
        }}
      >
        <Typography
          component="div"
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textWrap: 'balance'
          }}
        >
          {title}{' '}
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              opacity: 0.92,
              fontVariantNumeric: 'tabular-nums',
              typography: 'caption'
            }}
          >
            ({totalLabel})
          </Box>
        </Typography>
      </Box>
      <Box sx={{ bgcolor: 'background.paper' }}>
        {lines.map((l, idx) => (
          <Box
            key={`${l.set}-${l.number}-${idx}`}
            sx={{
              px: 1.5,
              py: 0.9,
              borderTop: idx === 0 ? 0 : 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1.25,
              alignItems: 'baseline',
              transition: 'background-color 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.045)
              }
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                minWidth: 22,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: 'primary.main'
              }}
            >
              {l.count}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                minWidth: 0,
                lineHeight: 1.55,
                textWrap: 'pretty'
              }}
            >
              {l.name}{' '}
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                ({l.set}-{l.number})
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

export default function DecklistModule({
  value,
  title,
  hideImageButton = false,
  showCopyListButton = false,
  mobileActionsInHeader = false
}: DecklistModuleProps) {
  const parsed = useMemo(() => parseDecklistText(value), [value])
  const showActions = !hideImageButton || showCopyListButton
  const hideActionsOnMobile = mobileActionsInHeader && showActions

  const pokemon = parsed.sections.find(s => s.id === 'pokemon')?.cards ?? []
  const trainer = parsed.sections.find(s => s.id === 'trainer')?.cards ?? []
  const energy = parsed.sections.find(s => s.id === 'energy')?.cards ?? []

  const pokemonTotal =
    parsed.sections.find(s => s.id === 'pokemon')?.declaredTotal ??
    pokemon.reduce((a, c) => a + c.count, 0)
  const trainerTotal =
    parsed.sections.find(s => s.id === 'trainer')?.declaredTotal ??
    trainer.reduce((a, c) => a + c.count, 0)
  const energyTotal =
    parsed.sections.find(s => s.id === 'energy')?.declaredTotal ??
    energy.reduce((a, c) => a + c.count, 0)

  return (
    <Stack spacing={2}>
      {title ? (
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: '1.15fr 1.15fr 0.88fr'
          },
          gap: { xs: 2, md: 2.5 },
          alignItems: 'start'
        }}
      >
        <SectionCard
          title="Pokémon"
          totalLabel={String(pokemonTotal)}
          lines={pokemon}
        />
        <SectionCard
          title="Trainer"
          totalLabel={String(trainerTotal)}
          lines={trainer}
        />
        <Stack
          spacing={2}
          sx={{
            gridColumn: { xs: 'auto', sm: '1 / -1', md: 'auto' },
            width: '100%'
          }}
        >
          <SectionCard
            title="Energy"
            totalLabel={String(energyTotal)}
            lines={energy}
          />

          {showActions ? (
            <Box
              sx={{
                width: '100%',
                display: hideActionsOnMobile
                  ? { xs: 'none', sm: 'block' }
                  : 'block'
              }}
            >
              <DecklistViewActions
                value={value}
                showImageButton={!hideImageButton}
                showCopyListButton={showCopyListButton}
              />
            </Box>
          ) : null}
        </Stack>
      </Box>

      {parsed.unknownLines.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'warning.main',
            bgcolor: theme => alpha(theme.palette.warning.main, 0.06)
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: '0.02em' }}
          >
            Líneas no reconocidas
          </Typography>
          <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
            {parsed.unknownLines.map((l, idx) => (
              <li key={idx}>
                <Typography variant="caption" color="text.secondary">
                  {l}
                </Typography>
              </li>
            ))}
          </Box>
        </Paper>
      ) : null}
    </Stack>
  )
}
