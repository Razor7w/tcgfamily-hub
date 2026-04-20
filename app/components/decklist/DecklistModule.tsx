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
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: 'grey.900',
          color: 'common.white'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title} ({totalLabel})
        </Typography>
      </Box>
      <Box sx={{ bgcolor: 'background.paper' }}>
        {lines.map((l, idx) => (
          <Box
            key={`${l.set}-${l.number}-${idx}`}
            sx={{
              px: 1.5,
              py: 0.85,
              borderTop: idx === 0 ? 0 : 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
              alignItems: 'baseline'
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 800, minWidth: 18, textAlign: 'right' }}
            >
              {l.count}
            </Typography>
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
              {l.name}{' '}
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
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
        bgcolor: '#1b1b1b',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06), transparent 45%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.05), transparent 55%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.05), transparent 55%)',
        border: '1px solid',
        borderColor: alpha('#ffffff', 0.08)
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
                boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
                border: '1px solid',
                borderColor: alpha('#ffffff', 0.08),
                cursor: 'zoom-in',
                outline: 'none',
                transition: 'transform 140ms ease, box-shadow 140ms ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 14px 30px rgba(0,0,0,0.42)'
                },
                '&:focus-visible': {
                  boxShadow:
                    '0 0 0 3px rgba(255,255,255,0.35), 0 14px 30px rgba(0,0,0,0.42)'
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
                  bgcolor: '#9b1b2e',
                  color: 'common.white',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: { xs: 12, sm: 14 },
                  border: '2px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.35)'
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
            <Typography sx={{ fontWeight: 900, flex: 1 }}>
              Deck image
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
          <DialogTitle sx={{ fontWeight: 800 }}>Deck image</DialogTitle>
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
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 1.2fr 0.8fr' },
          gap: 2,
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
        <Stack spacing={2}>
          <SectionCard
            title="Energy"
            totalLabel={String(energyTotal)}
            lines={energy}
          />

          <Stack spacing={1.25}>
            <Button
              variant="contained"
              onClick={() => setImageOpen(true)}
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              Open as Image
            </Button>
          </Stack>
        </Stack>
      </Box>

      {parsed.unknownLines.length > 0 ? (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700 }}
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
