'use client'

import { useState } from 'react'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import DecklistImageDialog from '@/components/decklist/DecklistImageDialog'
import {
  type DecklistFlatCard,
  flatCardsFromDecklistText
} from '@/lib/decklist'

export type DecklistImagePreviewSource =
  | {
      kind: 'decklist'
      decklistId: string
      listKind: 'base' | 'variant'
      variantId: string | null
      /** Título del modal; si se omite se usa el nombre devuelto por la API */
      title?: string
    }
  | { kind: 'event'; eventId: string }

type Props = {
  source: DecklistImagePreviewSource | null
  disabled?: boolean
}

/**
 * «Ver decklist»: carga el texto (por mazo guardado o por contexto de torneo) y abre la vista en imágenes.
 */
export default function DecklistImagePreviewButton({
  source,
  disabled
}: Props) {
  const [imageOpen, setImageOpen] = useState(false)
  const [imageCards, setImageCards] = useState<DecklistFlatCard[]>([])
  const [dialogTitle, setDialogTitle] = useState('Vista en imágenes')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const handleViewDecklist = async () => {
    if (!source) return
    setPreviewError(null)
    setPreviewLoading(true)
    try {
      if (source.kind === 'event') {
        const res = await fetch(
          `/api/events/${encodeURIComponent(source.eventId)}/tournament-decklist-preview`,
          { cache: 'no-store' }
        )
        const data = (await res.json()) as {
          error?: string
          title?: string
          deckText?: string
        }
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Error al cargar'
          )
        }
        const text = typeof data.deckText === 'string' ? data.deckText : ''
        const cards = flatCardsFromDecklistText(text)
        if (cards.length === 0) {
          setPreviewError(
            'Este listado no tiene cartas reconocibles para la vista en imágenes.'
          )
          return
        }
        setDialogTitle(
          typeof data.title === 'string' && data.title.trim()
            ? data.title
            : 'Vista en imágenes'
        )
        setImageCards(cards)
        setImageOpen(true)
        return
      }

      const res = await fetch(
        `/api/decklists/${encodeURIComponent(source.decklistId)}`
      )
      const data = (await res.json()) as {
        error?: string
        deckText?: string
        name?: string
        variants?: { id: string; deckText: string }[]
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Error al cargar'
        )
      }
      let text = typeof data.deckText === 'string' ? data.deckText : ''
      if (source.listKind === 'variant' && source.variantId) {
        const v = data.variants?.find(x => x.id === source.variantId)
        if (v?.deckText) text = v.deckText
      }
      const cards = flatCardsFromDecklistText(text)
      if (cards.length === 0) {
        setPreviewError(
          'Este listado no tiene cartas reconocibles para la vista en imágenes.'
        )
        return
      }
      const titleFromApi =
        typeof data.name === 'string' && data.name.trim() ? data.name : ''
      setDialogTitle(
        source.title?.trim() ||
          (titleFromApi ? titleFromApi : 'Vista en imágenes')
      )
      setImageCards(cards)
      setImageOpen(true)
    } catch (e) {
      setPreviewError(
        e instanceof Error ? e.message : 'No se pudo cargar el decklist'
      )
    } finally {
      setPreviewLoading(false)
    }
  }

  if (!source) return null

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        size="small"
        color="secondary"
        startIcon={
          previewLoading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <ImageOutlinedIcon fontSize="small" />
          )
        }
        disabled={disabled || previewLoading}
        onClick={() => void handleViewDecklist()}
        sx={{
          alignSelf: 'flex-start',
          fontWeight: 600,
          textTransform: 'none'
        }}
      >
        Ver decklist
      </Button>
      {previewError ? (
        <Alert
          severity="warning"
          onClose={() => setPreviewError(null)}
          sx={{ mt: 1 }}
        >
          {previewError}
        </Alert>
      ) : null}
      <DecklistImageDialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        cards={imageCards}
        title={dialogTitle}
      />
    </>
  )
}
