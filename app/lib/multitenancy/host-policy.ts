import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'

/**
 * Normaliza hostname (sin puerto, minúsculas).
 */
export function normalizedHostname(hostHeader: string | null): string {
  if (!hostHeader) return ''
  return hostHeader.split(':')[0]!.trim().toLowerCase()
}

/**
 * Slug público efectivo para el hub (un solo dominio): la tienda primary
 * o `MULTITENANCY_FALLBACK_PUBLIC_STORE_SLUG` si está definida.
 * No hay variantes por hostname.
 */
export function defaultPublicStoreSlugForHost(): string {
  const override = process.env.MULTITENANCY_FALLBACK_PUBLIC_STORE_SLUG?.trim()
  if (override) return override
  return DEFAULT_PRIMARY_STORE_SLUG
}
