'use client'

import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import DecklistImageGrid from '@/components/decklist/DecklistImageGrid'
import { type DecklistFlatCard } from '@/lib/decklist'

export type DecklistImageDialogProps = {
  open: boolean
  onClose: () => void
  cards: DecklistFlatCard[]
  /** Título del panel (p. ej. nombre del mazo y variante). */
  title?: string
  /** Texto del listado; si se pasa, muestra «Copiar lista». */
  deckText?: string
}

/**
 * Modal con rejilla de cartas Limitless + zoom; usado por «Ver como imagen» en listas privadas.
 */
export default function DecklistImageDialog({
  open,
  onClose,
  cards,
  title = 'Vista en imágenes',
  deckText
}: DecklistImageDialogProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const [listCopied, setListCopied] = useState(false)

  const showCopyList = Boolean(deckText?.trim())

  const handleClose = () => {
    setListCopied(false)
    onClose()
  }

  const handleCopyList = async () => {
    const text = deckText?.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setListCopied(true)
      window.setTimeout(() => setListCopied(false), 2000)
    } catch {
      setListCopied(false)
    }
  }

  const copyListButton = showCopyList ? (
    <Button
      type="button"
      variant="outlined"
      color="primary"
      startIcon={<ContentCopyIcon />}
      onClick={() => void handleCopyList()}
      aria-live="polite"
      sx={{ fontWeight: 700, textTransform: 'none' }}
    >
      {listCopied ? 'Listado copiado' : 'Copiar lista'}
    </Button>
  ) : null

  const grid = (
    <DecklistImageGrid
      key={open ? 'open' : 'closed'}
      cards={cards}
      deferMount
    />
  )

  if (!open) return null

  return (
    <>
      {isMobile ? (
        <Drawer
          open={open}
          onClose={handleClose}
          anchor="bottom"
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
              {title}
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
          {showCopyList ? (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1
              }}
            >
              {copyListButton}
            </Box>
          ) : null}
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
            {title}
          </DialogTitle>
          <DialogContent dividers>{grid}</DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            {copyListButton}
            <Button onClick={handleClose}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
