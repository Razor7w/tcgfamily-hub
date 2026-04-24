'use client'

import { useMemo, useState } from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Box, Button, Paper, Stack, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import DecklistImageDialog from '@/components/decklist/DecklistImageDialog'
import { flatCardsFromDecklistText, parseDecklistText } from '@/lib/decklist'

export type DecklistModuleProps = {
  /** Raw decklist text in the format shown in the prompt. */
  value: string
  /** Optional title shown above the module. */
  title?: string
  /** Oculta el CTA inferior (p. ej. si ya hay «Ver como imagen» en la cabecera de la página). */
  hideImageButton?: boolean
  /** Muestra «Copiar lista» debajo de «Ver como imagen» (p. ej. listas públicas). */
  showCopyListButton?: boolean
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
  showCopyListButton = false
}: DecklistModuleProps) {
  const parsed = useMemo(() => parseDecklistText(value), [value])
  const [imageOpen, setImageOpen] = useState(false)
  const [listCopied, setListCopied] = useState(false)

  const flatCards = useMemo(() => flatCardsFromDecklistText(value), [value])

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

          {!hideImageButton || showCopyListButton ? (
            <Stack spacing={1} sx={{ width: '100%' }}>
              {!hideImageButton ? (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => setImageOpen(true)}
                  sx={{
                    fontWeight: 700,
                    py: 1.15,
                    borderRadius: 1.5,
                    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                    '&:active': { transform: 'translateY(1px) scale(0.99)' },
                    boxShadow: theme =>
                      theme.palette.mode === 'dark'
                        ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`
                        : `0 8px 22px ${alpha(theme.palette.primary.dark, 0.22)}`,
                    '&:hover': {
                      boxShadow: theme =>
                        theme.palette.mode === 'dark'
                          ? `0 12px 28px ${alpha(theme.palette.primary.main, 0.32)}`
                          : `0 12px 26px ${alpha(theme.palette.primary.dark, 0.28)}`
                    }
                  }}
                >
                  Ver como imagen
                </Button>
              ) : null}
              {showCopyListButton ? (
                <Button
                  type="button"
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<ContentCopyIcon />}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(value)
                      setListCopied(true)
                      window.setTimeout(() => {
                        setListCopied(false)
                      }, 2000)
                    } catch {
                      setListCopied(false)
                    }
                  }}
                  aria-live="polite"
                  sx={{ fontWeight: 700, py: 1.1, borderRadius: 1.5 }}
                >
                  {listCopied ? 'Listado copiado' : 'Copiar lista'}
                </Button>
              ) : null}
            </Stack>
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

      {!hideImageButton ? (
        <DecklistImageDialog
          open={imageOpen}
          onClose={() => setImageOpen(false)}
          cards={flatCards}
        />
      ) : null}
    </Stack>
  )
}
