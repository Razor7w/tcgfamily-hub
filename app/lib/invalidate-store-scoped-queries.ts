import type { QueryClient } from '@tanstack/react-query'

/** Tras POST /api/me/active-store: refrescar vistas del dashboard acotadas a tienda. */
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
