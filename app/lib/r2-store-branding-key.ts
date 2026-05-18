import 'server-only'

/**
 * Solo permite borrar keys de marca bajo `store-branding/{storeId}/` (un segmento final, sin ..).
 */
export function isR2StoreBrandingKeyForStore(
  storeId: string,
  key: string
): boolean {
  const sid = storeId.trim()
  const k = key.trim()
  if (!sid || !k || k.includes('..')) return false
  const prefix = `store-branding/${sid}/`
  if (!k.startsWith(prefix)) return false
  const rest = k.slice(prefix.length)
  if (!rest || rest.includes('/')) return false
  return true
}
