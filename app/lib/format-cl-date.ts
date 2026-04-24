/**
 * Fecha/hora legible (es-CL) para HTML generado en el servidor.
 * Evita hydration mismatch: no uses `toLocaleString` en Client Components
 * para el mismo dato (Node y el navegador pueden diferir en espacios Unicode).
 */
export function formatClDateTimeMedium(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago'
  })
}
