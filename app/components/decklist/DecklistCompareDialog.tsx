'use client'

import { useMemo, useState } from 'react'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { compareDecklistTexts, type AggregatedCard } from '@/lib/decklist-diff'

type CompareVariant = { id: string; label: string; deckText: string }

type SourceId = 'base' | string

function initialPair(variants: CompareVariant[]): [SourceId, SourceId] {
  if (variants.length >= 2) return [variants[0]!.id, variants[1]!.id]
  if (variants.length === 1) return ['base', variants[0]!.id]
  return ['base', 'base']
}

function cardLine(c: AggregatedCard) {
  return (
    <Typography
      key={c.key}
      component="li"
      variant="body2"
      sx={{
        py: 0.65,
        px: 1.25,
        borderRadius: 1,
        listStyle: 'none',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.55,
        textWrap: 'pretty'
      }}
    >
      <Box
        component="span"
        sx={{ fontWeight: 800, color: 'primary.main', mr: 1 }}
      >
        {c.count}×
      </Box>
      {c.name}{' '}
      <Typography
        component="span"
        variant="body2"
        color="text.secondary"
        fontWeight={500}
      >
        ({c.set}-{c.number})
      </Typography>
    </Typography>
  )
}

export default function DecklistCompareDialog({
  open,
  onClose,
  baseDeckText,
  variants
}: {
  open: boolean
  onClose: () => void
  baseDeckText: string
  variants: CompareVariant[]
}) {
  const theme = useTheme()
  const [leftId, setLeftId] = useState<SourceId>(() => initialPair(variants)[0])
  const [rightId, setRightId] = useState<SourceId>(
    () => initialPair(variants)[1]
  )

  const labelFor = (id: SourceId) =>
    id === 'base'
      ? 'Listado base'
      : (variants.find(v => v.id === id)?.label ?? id)

  const diff = useMemo(() => {
    const textA =
      leftId === 'base'
        ? baseDeckText
        : (variants.find(v => v.id === leftId)?.deckText ?? '')
    const textB =
      rightId === 'base'
        ? baseDeckText
        : (variants.find(v => v.id === rightId)?.deckText ?? '')
    return compareDecklistTexts(textA, textB)
  }, [leftId, rightId, baseDeckText, variants])

  const options: { id: SourceId; label: string }[] = useMemo(
    () => [
      { id: 'base', label: 'Listado base' },
      ...variants.map(v => ({ id: v.id, label: v.label }))
    ],
    [variants]
  )

  const borderMuted = alpha(
    theme.palette.mode === 'dark'
      ? theme.palette.common.white
      : theme.palette.text.primary,
    0.12
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pr: 2.5
        }}
      >
        <CompareArrowsIcon color="primary" sx={{ opacity: 0.9 }} aria-hidden />
        Comparar listados
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight={500}
            sx={{ textWrap: 'pretty' }}
          >
            Elige dos versiones del mazo. Verás cartas que solo están a un lado,
            y cartas con distinto número de copias.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="decklist-compare-a">Listado A</InputLabel>
              <Select
                labelId="decklist-compare-a"
                label="Listado A"
                value={leftId}
                onChange={e => setLeftId(e.target.value as SourceId)}
              >
                {options.map(o => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="decklist-compare-b">Listado B</InputLabel>
              <Select
                labelId="decklist-compare-b"
                label="Listado B"
                value={rightId}
                onChange={e => setRightId(e.target.value as SourceId)}
              >
                {options.map(o => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {leftId === rightId ? (
            <Typography variant="body2" color="warning.main" fontWeight={600}>
              Selecciona dos listados distintos para comparar.
            </Typography>
          ) : diff.identical ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: alpha(theme.palette.success.main, 0.08),
                border: '1px solid',
                borderColor: alpha(theme.palette.success.main, 0.28)
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="success.main"
              >
                Mismas cartas y cantidades
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
                fontWeight={500}
              >
                «{labelFor(leftId)}» y «{labelFor(rightId)}» coinciden en el
                análisis por carta.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {diff.onlyInA.length > 0 ? (
                <Box
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: borderMuted,
                    borderLeftWidth: 4,
                    borderLeftColor: theme.palette.warning.main
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      bgcolor: alpha(theme.palette.warning.main, 0.1)
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{ letterSpacing: '-0.02em' }}
                    >
                      Solo en «{labelFor(leftId)}» ({diff.onlyInA.length})
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ m: 0, p: 0, py: 0.5 }}>
                    {diff.onlyInA.map(c => cardLine(c))}
                  </Box>
                </Box>
              ) : null}

              {diff.onlyInB.length > 0 ? (
                <Box
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: borderMuted,
                    borderLeftWidth: 4,
                    borderLeftColor: theme.palette.info.main
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      bgcolor: alpha(theme.palette.info.main, 0.08)
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{ letterSpacing: '-0.02em' }}
                    >
                      Solo en «{labelFor(rightId)}» ({diff.onlyInB.length})
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ m: 0, p: 0, py: 0.5 }}>
                    {diff.onlyInB.map(c => cardLine(c))}
                  </Box>
                </Box>
              ) : null}

              {diff.countChanged.length > 0 ? (
                <Box
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: borderMuted,
                    borderLeftWidth: 4,
                    borderLeftColor: theme.palette.secondary.main
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      bgcolor: alpha(theme.palette.secondary.main, 0.08)
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{ letterSpacing: '-0.02em' }}
                    >
                      Distinto número de copias ({diff.countChanged.length})
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ m: 0, p: 0, py: 0.5 }}>
                    {diff.countChanged.map(row => (
                      <Typography
                        key={row.card.key}
                        component="li"
                        variant="body2"
                        sx={{
                          py: 0.65,
                          px: 1.25,
                          listStyle: 'none',
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1.55,
                          textWrap: 'pretty'
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontWeight: 800,
                            color: 'secondary.main',
                            mr: 0.75
                          }}
                        >
                          {row.countA}× → {row.countB}×
                        </Box>
                        {row.card.name}{' '}
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          fontWeight={500}
                        >
                          ({row.card.set}-{row.card.number})
                        </Typography>
                      </Typography>
                    ))}
                  </Box>
                </Box>
              ) : null}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{ fontWeight: 600, textTransform: 'none' }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
