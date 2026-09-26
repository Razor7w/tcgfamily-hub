export const SELLER_SLUG_MAX = 48
export const SELLER_SLUG_MIN = 3

const SELLER_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeSellerSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SELLER_SLUG_MAX)
}

export function slugFromSellerName(name: string): string {
  const s = normalizeSellerSlug(name)
  return s.length >= SELLER_SLUG_MIN ? s : 'vendedor'
}

export function isValidSellerSlug(slug: string): boolean {
  if (!slug || slug.length < SELLER_SLUG_MIN) return false
  if (slug.length > SELLER_SLUG_MAX) return false
  return SELLER_SLUG_RE.test(slug)
}

export function sellerPublicPath(slug: string): string {
  return `/vendedores/${encodeURIComponent(slug)}`
}

export function sellerBinderPublicPath(
  sellerSlug: string,
  binderSlug: string
): string {
  return `/vendedores/${encodeURIComponent(sellerSlug)}/${encodeURIComponent(binderSlug)}`
}
