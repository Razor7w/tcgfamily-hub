/**
 * Rutas públicas tipo `/{slug}` (un solo segmento) que muestran el hub de Tiendas.
 *
 * Todo lo que en `app/` está en carpetas dedicadas (/admin, /dashboard, …) lo
 * resuelve Next antes que `app/[storeSlug]`; si agregás una ruta de un nivel,
 * debe existir página o middleware para que no la coma el hub de tiendas.
 */
export function isStoreContextHubPath(
  pathname: string | null | undefined
): boolean {
  if (!pathname || pathname === '/') return false
  const parts = pathname.split('/').filter(Boolean)
  return parts.length === 1 && parts[0] !== ''
}
