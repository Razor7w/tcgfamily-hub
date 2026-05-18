/** Evita POST duplicado a `/api/me/active-store` en el hub `/[slug]`. El header ya hizo POST y llamará `update()`, pero la nueva página monta con JWT aún viejo. */
const STORAGE_KEY = 'tcg-hub-header-active-store-sync'

const TTL_MS = 12000

export function setHubActiveStoreHeaderSync(storeId: string): void {
  if (typeof window === 'undefined' || !storeId.trim()) return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ storeId: storeId.trim(), at: Date.now() })
    )
  } catch {
    // privado/incógnito puede fallar sessionStorage
  }
}

/** Un solo uso: coincide con `hid` esperado del hub y TTL. */
export function consumeHubActiveStoreHeaderSync(
  expectedStoreId: string
): boolean {
  if (typeof window === 'undefined' || !expectedStoreId.trim()) return false
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const j = JSON.parse(raw) as { storeId?: string; at?: number }
    const at = typeof j.at === 'number' ? j.at : 0
    const stale = Date.now() - at > TTL_MS
    const sid = typeof j.storeId === 'string' ? j.storeId.trim() : ''
    if (stale || !sid) {
      sessionStorage.removeItem(STORAGE_KEY)
      return false
    }
    if (sid !== expectedStoreId.trim()) return false
    sessionStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
