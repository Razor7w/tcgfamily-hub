import { NextResponse } from 'next/server'

/** Consulta Mongo: solo eventos de tienda (no torneos custom de usuarios). */
export const ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER = {
  tournamentOrigin: { $ne: 'custom' }
} as const

type OriginField = { tournamentOrigin?: string | null }

/**
 * El panel `/admin/eventos` no gestiona torneos `custom`. Devuelve respuesta 404 si el documento
 * es custom o no existe; en caso contrario `null`.
 */
export function adminWeeklyEventForbiddenResponse(
  doc: OriginField | null | undefined
): NextResponse | null {
  if (!doc) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  if (doc.tournamentOrigin === 'custom') {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  return null
}
