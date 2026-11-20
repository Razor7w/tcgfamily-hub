import {
  MAIL_DESTINATION_CITIES,
  mailDestinationCityFromName,
  type MailDestinationCity
} from '@/lib/mail-destination'

export const MAIL_WITHDRAW_REQUIRES_IN_STORE =
  'No puedes marcar como retirado un correo que aún no fue recibido en tienda'

/** Estas cuentas no pueden retirar correos cuya sucursal en la tarjeta es la otra. */
const WITHDRAW_BLOCKED_BRANCH_BY_EMAIL: Record<string, MailDestinationCity> = {
  'vinadelmar@tcgfamily.cl': 'villa-alemana',
  'tcgfamilychile@gmail.com': 'vina-del-mar'
}

/** `null` si esa cuenta puede marcar el correo como retirado. */
export function mailWithdrawBranchDeniedMessage(
  email: string | null | undefined,
  branchName: string | null | undefined
): string | null {
  const blocked =
    WITHDRAW_BLOCKED_BRANCH_BY_EMAIL[email?.trim().toLowerCase() ?? '']
  if (!blocked) return null
  if (mailDestinationCityFromName(branchName ?? '') !== blocked) return null
  const label =
    MAIL_DESTINATION_CITIES.find(city => city.id === blocked)?.label ?? blocked
  return `No puedes marcar como retirado un correo de la sucursal ${label}.`
}

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
