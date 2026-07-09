const DEFAULT_AUTH_CALLBACK_URL = '/dashboard'

/** Solo rutas relativas internas (evita open redirect). */
export function resolveAuthCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AUTH_CALLBACK_URL
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return DEFAULT_AUTH_CALLBACK_URL
  }
  return trimmed
}
