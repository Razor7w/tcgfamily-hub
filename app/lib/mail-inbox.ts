import type { Mail } from '@/hooks/useMails'

export function mailUserId(ref: { _id: string } | string): string {
  return typeof ref === 'object' ? ref._id : String(ref)
}

export function isMailInvolved(mail: Mail, currentUserId: string): boolean {
  if (!currentUserId) return false
  if (mailUserId(mail.fromUserId) === currentUserId) return true
  if (mail.toUserId && mailUserId(mail.toUserId) === currentUserId) return true
  return Boolean(mail.toRut?.trim())
}

/** En tienda, listo para retirar por el receptor (no el emisor). */
export function isMailWaitingForPickup(
  mail: Mail,
  currentUserId: string
): boolean {
  if (mail.isRecived || !mail.isRecivedInStore) return false
  if (!currentUserId) return false
  if (mailUserId(mail.fromUserId) === currentUserId) return false
  if (mail.toUserId && mailUserId(mail.toUserId) === currentUserId) return true
  return Boolean(mail.toRut?.trim())
}

export function isMailPendingStoreReceipt(
  mail: Mail,
  currentUserId: string
): boolean {
  if (mail.isRecived || mail.isRecivedInStore) return false
  return isMailInvolved(mail, currentUserId)
}
