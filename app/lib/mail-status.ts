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
