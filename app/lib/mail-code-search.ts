import {
  filterFromUserFromRef,
  filterToRecipientFromMail,
  mailMatchesToRecipientFilter,
  type FilterFromUser,
  type FilterToRecipient
} from '@/lib/mail-recipient-filter'

/**
 * Unifica separadores al buscar códigos de correo: algunos lectores envían
 * apóstrofos u otros caracteres en lugar de guiones (p. ej. 19'04'2026'001 vs 19-04-2026-001).
 */
export function normalizeMailCodeForSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[''`´]/g, '-')
}

export type MailForCodeSearch = {
  _id: string
  code?: string
  fromUserId: unknown
  toUserId: unknown
  toRut?: string
  isRecived?: boolean
  isRecivedInStore?: boolean
}

export function mailMatchesCodeSearchQuery(
  m: MailForCodeSearch,
  searchId: string
): boolean {
  const qCode = normalizeMailCodeForSearch(searchId)
  const qId = searchId.trim().toLowerCase()
  if (!qCode && !qId) return true
  return (
    normalizeMailCodeForSearch(m.code ?? '').includes(qCode) ||
    m._id.toLowerCase().includes(qId)
  )
}

function isExactMailCodeMatch(m: MailForCodeSearch, searchId: string): boolean {
  const q = normalizeMailCodeForSearch(searchId)
  if (!q) return false
  return normalizeMailCodeForSearch(m.code ?? '') === q
}

/** «No recibido en tienda» (sin ingresar). */
export function isMailNotReceivedInStore(mail: {
  isRecived?: boolean
  isRecivedInStore?: boolean
}): boolean {
  return !mail.isRecived && !mail.isRecivedInStore
}

/** «En tienda» (pendiente retiro). */
export function isMailInStoreWaitingPickup(mail: {
  isRecived?: boolean
  isRecivedInStore?: boolean
}): boolean {
  return !mail.isRecived && Boolean(mail.isRecivedInStore)
}

export type MailCodeSearchExpansion =
  | { kind: 'senderNotInStore'; sender: FilterFromUser }
  | { kind: 'recipientInStore'; recipient: FilterToRecipient }

function resolveMailCodeSearchAnchor<T extends MailForCodeSearch>(
  allMails: T[],
  searchId: string
): T | null {
  const trimmed = searchId.trim()
  if (!trimmed) return null

  const codeMatches = allMails.filter(m =>
    mailMatchesCodeSearchQuery(m, trimmed)
  )
  if (codeMatches.length === 0) return null

  return (
    codeMatches.find(m => isExactMailCodeMatch(m, trimmed)) ??
    (codeMatches.length === 1 ? codeMatches[0] : null)
  )
}

/** Contexto de expansión por código (para acciones masivas en admin). */
export function resolveMailCodeSearchExpansion(
  allMails: MailForCodeSearch[],
  searchId: string
): MailCodeSearchExpansion | null {
  const anchor = resolveMailCodeSearchAnchor(allMails, searchId)
  if (!anchor) return null

  if (isMailNotReceivedInStore(anchor)) {
    const sender = filterFromUserFromRef(anchor.fromUserId)
    if (!sender) return null
    return { kind: 'senderNotInStore', sender }
  }

  if (isMailInStoreWaitingPickup(anchor)) {
    const recipient = filterToRecipientFromMail(anchor)
    if (!recipient) return null
    return { kind: 'recipientInStore', recipient }
  }

  return null
}

/**
 * Búsqueda por código con expansión contextual:
 * - Ancla «No recibido en tienda» → todos los del mismo emisor en ese estado.
 * - Ancla «En tienda» → todos los del mismo destinatario en ese estado.
 * - Otros estados o búsqueda ambigua → solo coincidencias por código.
 */
export function filterMailsByCodeSearch<T extends MailForCodeSearch>(
  allMails: T[],
  searchId: string
): T[] {
  const trimmed = searchId.trim()
  if (!trimmed) return allMails

  const codeMatches = allMails.filter(m =>
    mailMatchesCodeSearchQuery(m, trimmed)
  )
  if (codeMatches.length === 0) return codeMatches

  const anchor = resolveMailCodeSearchAnchor(allMails, trimmed)
  if (!anchor) return codeMatches

  if (isMailNotReceivedInStore(anchor)) {
    const sender = filterFromUserFromRef(anchor.fromUserId)
    if (!sender) return codeMatches
    return allMails.filter(
      m =>
        isMailNotReceivedInStore(m) &&
        filterFromUserFromRef(m.fromUserId)?.id === sender.id
    )
  }

  if (isMailInStoreWaitingPickup(anchor)) {
    const recipient = filterToRecipientFromMail(anchor)
    if (!recipient) return codeMatches
    return allMails.filter(
      m =>
        isMailInStoreWaitingPickup(m) &&
        mailMatchesToRecipientFilter(m, recipient)
    )
  }

  return codeMatches
}
