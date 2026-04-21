'use client'

import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Drawer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import { parseDecklistText, limitlessCardImageUrl } from '@/lib/decklist'

export type DecklistModuleProps = {
  /** Raw decklist text in the format shown in the prompt. */
  value: string
  /** Optional title shown above the module. */
  title?: string
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

function DeckImageDialog({
  open,
  onClose,
  cards
}: {
  open: boolean
  onClose: () => void
  cards: { count: number; set: string; number: number; name: string }[]
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [active, setActive] = useState<{
    count: number
    set: string
    number: number
    name: string
  } | null>(null)

  const handleClose = () => {
    setActive(null)
    onClose()
  }

  const grid = (
    <Box
      sx={{
        p: { xs: 1, sm: 2.5 },
        borderRadius: 0,
        bgcolor: theme.palette.background.default,
        backgroundImage: `radial-gradient(circle at 18% 18%, ${alpha(theme.palette.primary.light, 0.09)}, transparent 44%), radial-gradient(circle at 82% 12%, ${alpha(theme.palette.primary.main, 0.07)}, transparent 48%), radial-gradient(circle at 50% 88%, ${alpha('#ffffff', 0.04)}, transparent 52%)`,
        border: '1px solid',
        borderColor: alpha(
          theme.palette.mode === 'dark'
            ? theme.palette.common.white
            : theme.palette.primary.dark,
          0.1
        )
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(6, minmax(0, 1fr))',
            sm: 'repeat(6, minmax(0, 1fr))',
            md: 'repeat(10, minmax(0, 1fr))',
            lg: 'repeat(12, minmax(0, 1fr))'
          },
          gap: { xs: 0.75, sm: 1.1, md: 1 }
        }}
      >
        {cards.map(c => {
          const src = limitlessCardImageUrl({
            set: c.set,
            number: c.number,
            size: 'LG'
          })
          return (
            <Box
              key={`${c.set}-${c.number}`}
              role="button"
              tabIndex={0}
              onClick={() => setActive(c)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setActive(c)
              }}
              sx={{
                position: 'relative',
                borderRadius: 0,
                overflow: 'hidden',
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.dark, 0.28)}`,
                border: '1px solid',
                borderColor: alpha(theme.palette.common.white, 0.1),
                cursor: 'zoom-in',
                outline: 'none',
                transition:
                  'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 18px 36px ${alpha(theme.palette.primary.dark, 0.38)}`
                },
                '&:focus-visible': {
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.light, 0.45)}, 0 18px 36px ${alpha(theme.palette.primary.dark, 0.38)}`
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${c.name} ${c.set} ${c.number}`}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: { xs: 6, sm: 8 },
                  left: { xs: 6, sm: 8 },
                  width: { xs: 24, sm: 30 },
                  height: { xs: 24, sm: 30 },
                  borderRadius: 999,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: { xs: 12, sm: 14 },
                  fontVariantNumeric: 'tabular-nums',
                  border: '2px solid',
                  borderColor: alpha(theme.palette.common.white, 0.88),
                  boxShadow: `0 10px 22px ${alpha(theme.palette.primary.dark, 0.35)}`
                }}
              >
                {c.count}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )

  return (
    <>
      {isMobile ? (
        <Drawer
          open={open}
          onClose={handleClose}
          anchor="bottom"
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              height: 'min(100dvh, 100%)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
              bgcolor: 'background.default'
            }
          }}
        >
          <Box
            sx={{
              px: 2,
              pt: 1.5,
              pb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Typography
              sx={{ fontWeight: 800, flex: 1, letterSpacing: '-0.02em' }}
            >
              Vista en imágenes
            </Typography>
            <IconButton onClick={handleClose} aria-label="Cerrar">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box
            sx={{
              p: 2,
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <Box sx={{ maxWidth: 980, mx: 'auto' }}>{grid}</Box>
          </Box>
        </Drawer>
      ) : (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="lg"
          fullWidth
          scroll="paper"
        >
          <DialogTitle sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Vista en imágenes
          </DialogTitle>
          <DialogContent dividers>{grid}</DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        scroll="body"
        aria-labelledby="deck-card-zoom-title"
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
            m: { xs: 0, sm: 4 },
            width: { xs: '100vw', sm: 'auto' },
            maxWidth: { xs: '100vw', sm: 'md' }
          }
        }}
        sx={{
          '& .MuiDialog-container': {
            alignItems: { xs: 'center', sm: 'center' }
          }
        }}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(3px)'
            }
          }
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
            minHeight: { xs: '100dvh', sm: 'auto' },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {active ? (
            <Box
              sx={{
                width: {
                  xs: 'min(520px, 92vw)',
                  sm: 'min(420px, 86vw)'
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mb: 0.75
                }}
              >
                <Button
                  variant="text"
                  onClick={() => setActive(null)}
                  sx={{
                    color: 'rgba(255,255,255,0.88)',
                    textTransform: 'none',
                    fontWeight: 900,
                    px: 1,
                    minWidth: 0,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                  }}
                >
                  Cerrar
                </Button>
              </Box>
              <Typography
                id="deck-card-zoom-title"
                variant="subtitle2"
                sx={{
                  color: 'rgba(255,255,255,0.92)',
                  fontWeight: 800,
                  mb: 1,
                  textAlign: 'center'
                }}
              >
                {active.name}{' '}
                <Typography
                  component="span"
                  variant="subtitle2"
                  sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 700 }}
                >
                  ({active.set}-{active.number}) · x{active.count}
                </Typography>
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 0,
                  overflow: 'visible',
                  boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
                  border: '1px solid',
                  borderColor: alpha('#ffffff', 0.12),
                  bgcolor: 'rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxHeight: 'none'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={limitlessCardImageUrl({
                    set: active.set,
                    number: active.number,
                    size: 'LG'
                  })}
                  alt={`${active.name} ${active.set} ${active.number}`}
                  loading="eager"
                  style={{
                    display: 'block',
                    maxWidth: 'min(520px, 92vw)',
                    width: '100%',
                    height: 'auto',
                    maxHeight: 'calc(100dvh - 180px)',
                    objectFit: 'contain'
                  }}
                />
              </Box>
            </Box>
          ) : null}
        </Box>
      </Dialog>
    </>
  )
}

export default function DecklistModule({ value, title }: DecklistModuleProps) {
  const parsed = useMemo(() => parseDecklistText(value), [value])
  const [imageOpen, setImageOpen] = useState(false)

  const flatCards = useMemo(() => {
    const all = parsed.sections.flatMap(s => s.cards)
    // De-duplicate by set+number, sum counts if duplicated
    const map = new Map<
      string,
      { count: number; set: string; number: number; name: string }
    >()
    for (const c of all) {
      const key = `${c.set}-${c.number}`
      const prev = map.get(key)
      if (prev) prev.count += c.count
      else
        map.set(key, {
          count: c.count,
          set: c.set,
          number: c.number,
          name: c.name
        })
    }
    return Array.from(map.values())
  }, [parsed.sections])

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

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => setImageOpen(true)}
            sx={{
              fontWeight: 700,
              py: 1.15,
              borderRadius: 1.5,
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

      <DeckImageDialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        cards={flatCards}
      />
    </Stack>
  )
}
