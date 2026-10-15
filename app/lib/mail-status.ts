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

import type { MailTransferView } from '@/lib/mail-store-transfer'

/** Chip de estado alineado con la card “Últimos correos” del dashboard. */
export type MailStatusChip = {
  label: string
  color: 'default' | 'warning' | 'success' | 'info'
}

export function getMailStatusChip(mail: {
  isRecived?: boolean
  isRecivedInStore?: boolean
  transfer?: MailTransferView | null
}): MailStatusChip {
  const origin = mail.transfer?.originBranchName?.trim()
  const dest = mail.transfer?.destinationBranchName?.trim()
  if (mail.isRecived) return { label: 'Retirado', color: 'success' }
  if (mail.transfer?.status === 'received' && dest) {
    return { label: `Recibido en ${dest}`, color: 'warning' }
  }
  if (mail.transfer?.status === 'in_transit') {
    return {
      label: dest
        ? `Recibido en ${origin || 'origen'} · hacia ${dest}`
        : 'En tránsito entre sucursales',
      color: 'info'
    }
  }
  if (mail.transfer?.status === 'requested' && dest) {
    return { label: `Se enviará a ${dest}`, color: 'info' }
  }
  if (mail.isRecivedInStore) return { label: 'En tienda', color: 'warning' }
  return { label: 'No recibido en tienda', color: 'default' }
}
