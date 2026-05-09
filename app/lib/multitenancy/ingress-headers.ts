export const STORE_SLUG_INGRESS_SENTINEL = '__none__'

/** Lee el slug inyectado por `middleware.ts` desde el host público actual. */
export function publicStoreSlugFromHeaders(h: {
  get(name: string): string | null | undefined
}): string | null {
  const raw = h.get('x-default-store-slug')
  if (
    raw == null ||
    raw === '' ||
    raw === STORE_SLUG_INGRESS_SENTINEL
  ) {
    return null
  }
  return raw.trim().toLowerCase()
}
