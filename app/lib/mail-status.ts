/** Fecha/hora para listados admin e historial (Chile, 24h). */
export function formatMailLogDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/** Chip de estado alineado con la card “Últimos correos” del dashboard. */
export type MailStatusChip = {
  label: string
  color: 'default' | 'warning' | 'success'
}

export function getMailStatusChip(mail: {
  isRecived?: boolean
  isRecivedInStore?: boolean
}): MailStatusChip {
  if (mail.isRecived) return { label: 'Retirado', color: 'success' }
  if (mail.isRecivedInStore) return { label: 'En tienda', color: 'warning' }
  return { label: 'No recibido en tienda', color: 'default' }
}
