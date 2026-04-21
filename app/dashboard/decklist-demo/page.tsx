'use client'

import { useState } from 'react'
import Link from 'next/link'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import DecklistModule from '@/components/decklist/DecklistModule'

const SAMPLE = `Pokémon: 21
4 Cynthia's Gible DRI 102
4 Cynthia's Gabite DRI 103
3 Cynthia's Garchomp ex DRI 104
4 Cynthia's Roselia DRI 7
4 Cynthia's Roserade DRI 8
1 Cynthia's Spiritomb DRI 129
1 Budew ASC 16

Trainer: 31
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Hilda WHT 84
2 Surfer SSP 187
2 Judge POR 76
4 Buddy-Buddy Poffin TEF 144
3 Fighting Gong MEG 116
3 Poké Pad POR 81
2 Premium Power Pro MEG 124
2 Night Stretcher ASC 196
1 Ultra Ball MEG 131
3 Cynthia's Power Weight DRI 162

Energy: 8
4 Fighting Energy MEE 6
3 Rocky Fighting Energy POR 87
1 Neo Upper Energy TEF 162
`

export default function DecklistDemoPage() {
  const theme = useTheme()
  const [value, setValue] = useState(SAMPLE)
  const deckText = value.trim() ? value : SAMPLE

  return (
    <Box
      component="main"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: theme.palette.mode === 'dark' ? 0.04 : 0.06,
          backgroundImage: `radial-gradient(circle at 12% 18%, ${alpha(theme.palette.primary.main, 0.22)} 0%, transparent 42%), radial-gradient(circle at 88% 8%, ${alpha(theme.palette.primary.light, 0.12)} 0%, transparent 38%), url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat, no-repeat, repeat',
          backgroundSize: '100% 100%, 100% 100%, 180px 180px'
        }
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          py: { xs: 3, sm: 4, md: 5 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Button
            component={Link}
            href="/dashboard"
            startIcon={<ArrowBackIcon />}
            variant="text"
            color="inherit"
            sx={{
              alignSelf: 'flex-start',
              px: 1,
              minWidth: 0,
              color: 'text.secondary',
              fontWeight: 600,
              '&:hover': {
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.06)
              }
            }}
          >
            Volver al panel
          </Button>

          <Stack spacing={1.5} sx={{ maxWidth: '72ch' }}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'primary.main'
              }}
            >
              Herramientas
            </Typography>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.12,
                textWrap: 'balance',
                fontSize: { xs: '1.65rem', sm: '2rem', md: '2.125rem' }
              }}
            >
              Decklist demo
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                lineHeight: 1.65,
                textWrap: 'pretty',
                fontWeight: 500
              }}
            >
              Pega el texto del mazo: se agrupa por Pokémon, entrenadores y
              energías. Desde la vista previa puedes abrir la parrilla de cartas
              con zoom por carta.
            </Typography>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.75 },
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.08 : 0.04
              ),
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 18px 40px -24px ${alpha('#000', 0.55)}`
                  : `0 16px 36px -28px ${alpha(theme.palette.primary.dark, 0.18)}`
            }}
          >
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Texto del deck
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 500, maxWidth: '62ch' }}
                >
                  Formato: línea de sección con total (p. ej. Pokémon: 21),
                  luego cantidad, nombre, código de set y número.
                </Typography>
              </Stack>
              <TextField
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={`Ejemplo:\nPokémon: 21\n4 Cynthia's Gible DRI 102\n...`}
                multiline
                minRows={10}
                maxRows={22}
                fullWidth
                size="small"
                aria-label="Texto del decklist"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                    borderRadius: 1.5
                  },
                  '& .MuiInputBase-input': {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.8125rem',
                    lineHeight: 1.65,
                    fontVariantNumeric: 'tabular-nums'
                  }
                }}
              />
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ gap: 1 }}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setValue(SAMPLE)}
                  sx={{ fontWeight: 600 }}
                >
                  Cargar ejemplo
                </Button>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => setValue('')}
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'text.primary',
                      bgcolor: alpha(theme.palette.text.primary, 0.06)
                    }
                  }}
                >
                  Limpiar
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Stack spacing={2}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
            >
              Vista previa
            </Typography>
            <DecklistModule value={deckText} />
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
