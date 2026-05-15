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
 * Tras cambiar tienda desde el header: solo reescribe la URL cuando estamos en el hub
 * `/{slug}` de **otra** tienda. Así `/dashboard` y cualquier `/dashboard/...` se mantienen;
 * `/tcgfamily` con nueva tienda `otra` navega a `/otra`.
 */
export function shouldRewriteStoreHubUrlAfterStoreSwitch(
  pathname: string | null | undefined,
  selectedStoreSlug: string | null | undefined
): boolean {
  const p = pathname ?? ''
  if (!isStoreContextHubPath(p)) return false
  const next =
    typeof selectedStoreSlug === 'string' ? selectedStoreSlug.trim() : ''
  if (!next) return false
  const seg = p.split('/').filter(Boolean)[0] ?? ''
  if (!seg) return false
  return seg.toLowerCase() !== next.toLowerCase()
}
