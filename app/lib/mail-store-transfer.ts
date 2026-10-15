/** Costo informado al usuario por enviar un correo de una sucursal a otra. */
export const MAIL_BRANCH_TRANSFER_FEE_CLP = 500

export type MailTransferStatus = 'requested' | 'in_transit' | 'received'

export type MailTransferView = {
  status?: MailTransferStatus | string
  feeClp?: number
  originBranchName?: string
  destinationBranchName?: string
  destinationBranchId?: string
}

export function formatMailTransferFee(
  clp = MAIL_BRANCH_TRANSFER_FEE_CLP
): string {
  return `$${clp.toLocaleString('es-CL')}`
}

/** Dirección del viaje: sucursal de origen → sucursal de destino. */
export function mailTransferRouteLabel(
  transfer: MailTransferView | null | undefined
): string {
  if (!transfer) return ''
  const from = transfer.originBranchName?.trim() || ''
  const to = transfer.destinationBranchName?.trim() || ''
  if (!from && !to) return ''
  return `${from || 'Origen'} → ${to || 'Destino'}`
}

export function mailTransferStatusSentence(
  transfer: MailTransferView | null | undefined
): string {
  if (!transfer) return ''
  const origin = transfer.originBranchName?.trim() || 'la sucursal de origen'
  const dest =
    transfer.destinationBranchName?.trim() || 'la sucursal de destino'
  if (transfer.status === 'requested') {
    return `Al marcarlo recibido en ${origin}, se enviará a ${dest}.`
  }
  if (transfer.status === 'in_transit') {
    return `Recibido en ${origin}, será enviado a ${dest}.`
  }
  if (transfer.status === 'received') {
    return `Recibido en ${dest}.`
  }
  return ''
}
