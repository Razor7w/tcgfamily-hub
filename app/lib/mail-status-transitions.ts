export const MAIL_WITHDRAW_REQUIRES_IN_STORE =
  'No puedes marcar como retirado un correo que aún no fue recibido en tienda'

export function canMarkMailWithdrawn(mail: {
  isRecivedInStore?: boolean
}): boolean {
  return Boolean(mail.isRecivedInStore)
}

/** Valida transición de estado; `null` = OK. */
export function validateMailStatusTransition(input: {
  nextIsRecived: boolean
  nextIsRecivedInStore: boolean
}): string | null {
  if (input.nextIsRecived && !input.nextIsRecivedInStore) {
    return MAIL_WITHDRAW_REQUIRES_IN_STORE
  }
  return null
}

export function resolveMailStatusAfterUpdate(input: {
  isRecived?: boolean
  isRecivedInStore?: boolean
  currentIsRecived: boolean
  currentIsRecivedInStore: boolean
}): { isRecived: boolean; isRecivedInStore: boolean } {
  let nextIsRecived =
    typeof input.isRecived === 'boolean'
      ? input.isRecived
      : input.currentIsRecived
  const nextIsRecivedInStore =
    typeof input.isRecivedInStore === 'boolean'
      ? input.isRecivedInStore
      : input.currentIsRecivedInStore

  if (!nextIsRecivedInStore) {
    nextIsRecived = false
  }

  return { isRecived: nextIsRecived, isRecivedInStore: nextIsRecivedInStore }
}
