/** Teléfono de contacto del envío (opcional). */
export const MAIL_CONTACT_PHONE_MAX = 30

export function normalizeMailContactPhone(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, MAIL_CONTACT_PHONE_MAX)
}
