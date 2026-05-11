/**
 * Rutas `/algo` donde `algo` pertenece a la app pero no es el hub `[storeSlug]`
 * (`/dashboard`, `/admin`, …). Next las resuelve antes que `app/[storeSlug]`.
 */
export const SINGLE_SEGMENT_STATIC_APP_ROUTES = new Set([
  'admin',
  'api',
  'auth',
  'dashboard',
  'ligas',
  'select-store'
])

/**
 * URL `/{slug}` con **un solo** segmento que es el hub de Tiendas (`app/[storeSlug]`).
 * Excluye `/dashboard`, `/admin`, etc.; esas tienen prefijo igual de un nivel pero son otra página.
 */
export function isStoreContextHubPath(
  pathname: string | null | undefined
): boolean {
  if (!pathname || pathname === '/') return false
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length !== 1) return false
  const seg = parts[0]
  return !!seg && !SINGLE_SEGMENT_STATIC_APP_ROUTES.has(seg)
}

/**
 * Tras cambiar la tienda en el header: navegar al slug en la URL cuando el usuario
 * está ya en ese hub (`/tcgfamily`) o en equiv. “inicio de panel” donde la URL no
 * refleja aún la tienda (`/dashboard`, `/dashboard/tiendas`).
 * Si está en otros módulos (`/dashboard/mail`, …) solo refresca datos en la misma ruta.
 */
export function shouldReplaceUrlWithActiveStoreSlug(
  pathname: string | null | undefined
): boolean {
  const p = pathname ?? ''
  if (isStoreContextHubPath(p)) return true
  if (p === '/dashboard' || p === '/dashboard/tiendas') return true
  return false
}
