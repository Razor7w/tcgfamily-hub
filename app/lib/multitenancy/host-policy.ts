import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'

/**
 * Normaliza hostname (sin puerto, minúsculas).
 */
export function normalizedHostname(hostHeader: string | null): string {
  if (!hostHeader) return ''
  return hostHeader.split(':')[0]!.trim().toLowerCase()
}

/** Host donde el usuario debe elegir tienda explícita (no se asume TCGFamily sólo por el dominio). */
export function hostRequiresExplicitStore(hostname: string): boolean {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return false
  }
  const h = hostname.toLowerCase()
  return h === 'tcgnexo.cl' || h === 'www.tcgnexo.cl'
}

/**
 * Slug de tienda usado como contexto público cuando aún no hay JWT con `activeStoreId`
 * (o para anónimos en rutas legacy).
 *
 * `null` ⇒ no hay default desde el host (p. ej. tcgnexo.cl).
 */
export function defaultPublicStoreSlugForHost(hostname: string): string | null {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return DEFAULT_PRIMARY_STORE_SLUG
  }
  if (hostRequiresExplicitStore(hostname)) {
    return null
  }
  const override = process.env.MULTITENANCY_FALLBACK_PUBLIC_STORE_SLUG?.trim()
  if (override) return override
  return DEFAULT_PRIMARY_STORE_SLUG
}

export function hostNeedsStoreChoiceBeforeProtectedRoutes(hostname: string) {
  return hostRequiresExplicitStore(hostname)
}
