import {
  DECKLIST_VARIANT_LABEL_MAX,
  SAVED_DECKLIST_TEXT_MAX
} from '@/lib/decklist-constants'

export function parseNewVariantPayload(body: unknown): {
  label: string
  deckText: string
} | null {
  const o =
    body && typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : null
  if (!o) return null
  const label =
    typeof o.label === 'string'
      ? o.label.trim().slice(0, DECKLIST_VARIANT_LABEL_MAX)
      : ''
  const deckText = typeof o.deckText === 'string' ? o.deckText.trim() : ''
  if (!label || !deckText || deckText.length > SAVED_DECKLIST_TEXT_MAX) {
    return null
  }
  return { label, deckText }
}

export function parsePatchVariantPayload(body: unknown): {
  label?: string
  deckText?: string
} | null {
  const o =
    body && typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : null
  if (!o) return null
  const out: { label?: string; deckText?: string } = {}
  if ('label' in o) {
    if (typeof o.label !== 'string') return null
    const label = o.label.trim().slice(0, DECKLIST_VARIANT_LABEL_MAX)
    if (!label) return null
    out.label = label
  }
  if ('deckText' in o) {
    if (typeof o.deckText !== 'string') return null
    const deckText = o.deckText.trim()
    if (!deckText || deckText.length > SAVED_DECKLIST_TEXT_MAX) return null
    out.deckText = deckText
  }
  if (Object.keys(out).length === 0) return null
  return out
}
