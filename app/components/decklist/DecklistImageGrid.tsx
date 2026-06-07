'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { limitlessCardImageUrl, type DecklistFlatCard } from '@/lib/decklist'

type Props = {
  cards: DecklistFlatCard[]
  /** Retrasa el montaje de imágenes un frame (útil al abrir modales). */
  deferMount?: boolean
}

function DecklistCardZoomDialog({
  card,
  onClose
}: {
  card: DecklistFlatCard | null
  onClose: () => void
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })

  return (
    <Dialog
      open={Boolean(card)}
      onClose={onClose}
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
        {card ? (
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
                onClick={onClose}
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
              {card.name}{' '}
              <Typography
                component="span"
                variant="subtitle2"
                sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 700 }}
              >
                ({card.set}-{card.number}) · x{card.count}
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
                  set: card.set,
                  number: card.number,
                  size: 'LG',
                  cardName: card.name
                })}
                alt={`${card.name} ${card.set} ${card.number}`}
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
  )
}

/** Rejilla de cartas Limitless con zoom al tocar/clic. */
export default function DecklistImageGrid({
  cards,
  deferMount = false
}: Props) {
  const theme = useTheme()
  const [active, setActive] = useState<DecklistFlatCard | null>(null)
  const [deferredReady, setDeferredReady] = useState(false)

  useEffect(() => {
    if (!deferMount) return

    let cancelled = false
    const id = window.requestAnimationFrame(() => {
      if (!cancelled) setDeferredReady(true)
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
    }
  }, [deferMount, cards])

  const gridReady = !deferMount || deferredReady

  if (cards.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
        No hay cartas para mostrar en este listado.
      </Typography>
    )
  }

  if (!gridReady) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          py: 4
        }}
      >
        <CircularProgress size={36} aria-label="Cargando cartas" />
      </Box>
    )
  }

  return (
    <>
      <Box
        sx={{
          p: { xs: 0.5, sm: 1.5 },
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
              size: 'SM',
              cardName: c.name
            })
            return (
              <Box
                key={`${c.set}-${c.number}-${c.name}`}
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

      <DecklistCardZoomDialog card={active} onClose={() => setActive(null)} />
    </>
  )
}
