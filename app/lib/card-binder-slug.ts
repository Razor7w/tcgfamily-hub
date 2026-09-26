export const CARD_BINDER_SLUG_MAX = 48
export const CARD_BINDER_SLUG_MIN = 3

const BINDER_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeCardBinderSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CARD_BINDER_SLUG_MAX)
}

export function slugFromCardBinderName(name: string): string {
  return normalizeCardBinderSlug(name)
}

export function isValidCardBinderSlug(slug: string): boolean {
  if (!slug || slug.length < CARD_BINDER_SLUG_MIN) return false
  if (slug.length > CARD_BINDER_SLUG_MAX) return false
  return BINDER_SLUG_RE.test(slug)
}

export function cardBinderPublicPath(slug: string): string {
  return `/carpetas/${encodeURIComponent(slug)}`
}
