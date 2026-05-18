import type { QueryClient } from '@tanstack/react-query'

/** Refetch masivo por prefijo de queryKey (evitar tras cambio de tienda si las keys incluyen activeStoreId: duplica peticiones). */
export async function invalidateStoreScopedDashboardQueries(
  qc: QueryClient
): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['weekly-events'] }),
    qc.invalidateQueries({ queryKey: ['my-tournaments-week'] }),
    qc.invalidateQueries({ queryKey: ['my-recent-tournaments'] }),
    qc.invalidateQueries({ queryKey: ['my-tournaments-all'] }),
    qc.invalidateQueries({ queryKey: ['mails', 'me'] }),
    qc.invalidateQueries({ queryKey: ['me', 'store-credit'] })
  ])
}
