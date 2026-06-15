export type DecklistPrincipalTarget = {
  /** Texto del listado principal en uso. */
  text: string
  /** `base` = listado base del mazo; si no, id de variante. */
  target: 'base' | string
  /** Etiqueta legible del listado que se edita. */
  label: string
}

type VariantLike = { id: string; label: string; deckText: string }

/** Resuelve qué listado muestra la pestaña «Principal» en un mazo guardado. */
export function resolvePrincipalDeckTarget(params: {
  baseDeckText: string
  principalVariantId: string | null
  variants: VariantLike[]
}): DecklistPrincipalTarget {
  if (!params.principalVariantId) {
    return {
      text: params.baseDeckText,
      target: 'base',
      label: 'Listado base'
    }
  }
  const variant = params.variants.find(v => v.id === params.principalVariantId)
  if (!variant) {
    return {
      text: params.baseDeckText,
      target: 'base',
      label: 'Listado base'
    }
  }
  return {
    text: variant.deckText,
    target: variant.id,
    label: variant.label
  }
}
