'use client'

import { startTransition, useMemo, useState } from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import DecklistImageDialog from '@/components/decklist/DecklistImageDialog'
import { flatCardsFromDecklistText } from '@/lib/decklist'

type Props = {
  value: string
  showImageButton?: boolean
  showCopyListButton?: boolean
  /** Botones compactos para cabecera en móvil. */
  compact?: boolean
}

export default function DecklistViewActions({
  value,
  showImageButton = true,
  showCopyListButton = false,
  compact = false
}: Props) {
  const [imageOpen, setImageOpen] = useState(false)
  const [listCopied, setListCopied] = useState(false)
  const flatCards = useMemo(() => flatCardsFromDecklistText(value), [value])

  if (!showImageButton && !showCopyListButton) return null

  return (
    <>
      <Stack
        spacing={compact ? 0.75 : 1}
        sx={{
          width: compact ? 'auto' : '100%',
          flexShrink: 0
        }}
      >
        {showImageButton ? (
          <Button
            variant="contained"
            color="primary"
            fullWidth={!compact}
            size={compact ? 'small' : 'medium'}
            disabled={flatCards.length === 0}
            onClick={() => startTransition(() => setImageOpen(true))}
            sx={theme => ({
              fontWeight: 700,
              py: compact ? 0.55 : 1.15,
              px: compact ? 1.25 : undefined,
              borderRadius: 1.5,
              fontSize: compact ? '0.75rem' : undefined,
              whiteSpace: 'nowrap',
              transition: 'transform 0.15s ease, box-shadow 0.2s ease',
              '&:active': { transform: 'translateY(1px) scale(0.99)' },
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`
                  : `0 8px 22px ${alpha(theme.palette.primary.dark, 0.22)}`,
              '&:hover': {
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? `0 12px 28px ${alpha(theme.palette.primary.main, 0.32)}`
                    : `0 12px 26px ${alpha(theme.palette.primary.dark, 0.28)}`
              }
            })}
          >
            Ver como imagen
          </Button>
        ) : null}
        {showCopyListButton ? (
          <Button
            type="button"
            variant="outlined"
            color="primary"
            fullWidth={!compact}
            size={compact ? 'small' : 'medium'}
            startIcon={
              compact ? (
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              ) : (
                <ContentCopyIcon />
              )
            }
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value)
                setListCopied(true)
                window.setTimeout(() => setListCopied(false), 2000)
              } catch {
                setListCopied(false)
              }
            }}
            aria-live="polite"
            sx={{
              fontWeight: 700,
              py: compact ? 0.5 : 1.1,
              px: compact ? 1.25 : undefined,
              borderRadius: 1.5,
              fontSize: compact ? '0.75rem' : undefined,
              whiteSpace: 'nowrap'
            }}
          >
            {listCopied ? 'Copiado' : 'Copiar lista'}
          </Button>
        ) : null}
      </Stack>

      {showImageButton && imageOpen ? (
        <DecklistImageDialog
          open={imageOpen}
          onClose={() => setImageOpen(false)}
          cards={flatCards}
          deckText={showCopyListButton ? value : undefined}
        />
      ) : null}
    </>
  )
}
