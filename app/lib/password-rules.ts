/**
 * Reglas compartidas cliente/servidor (sin dependencias de Node).
 */

const EMAIL_MAX = 254
const NAME_MIN = 2
const NAME_MAX = 100
const PASSWORD_MIN = 12
const PASSWORD_MAX = 128

/** Hash bcrypt ficticio para ramas sin usuario (mitigación de timing). */
export const PASSWORD_TIMING_DUMMY_HASH =
  '$2b$12$FHzcN/1qwIafMeYKGJTKKe3iNseKU3r.5UFFlF6eNPdkoJ78S7TtG'

const WEAK_PASSWORDS = new Set(
  [
    'password',
    'password123',
    'contraseña',
    '12345678',
    '123456789',
    'qwerty123456',
    'admin123456',
    'letmein123',
    'welcome123'
  ].map(s => s.toLowerCase())
)

/**
 * Comprobación final de caracteres permitidos (ASCII habitual en correos).
 * Va después de validar estructura local@dominio.
 */
const EMAIL_FULL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * Valida un correo usable para registro: usuario@dominio con extensión (TLD),
 * longitudes razonables y sin artefactos obvios (espacios, puntos dobles, varios @).
 */
export function validateEmailFormat(email: string): string | null {
  if (!email) return 'El correo es obligatorio.'
  if (email.length > EMAIL_MAX) return 'El correo es demasiado largo.'
  if (/\s/.test(email)) {
    return 'El correo no puede contener espacios ni saltos de línea.'
  }

  const atCount = (email.match(/@/g) ?? []).length
  if (atCount !== 1) {
    return 'Usa un solo símbolo @ (formato usuario@dominio).'
  }

  const [local, domain] = email.split('@') as [string, string]
  if (!local || !domain) {
    return 'Introduce un correo con formato usuario@dominio.'
  }
  if (local.length > 64) {
    return 'La parte antes de @ es demasiado larga.'
  }
  if (domain.length > 253) {
    return 'El dominio del correo no es válido.'
  }
  if (local.startsWith('.') || local.endsWith('.')) {
    return 'La parte antes de @ no puede empezar ni terminar con punto.'
  }
  if (local.includes('..')) {
    return 'La parte antes de @ no puede tener puntos seguidos.'
  }
  if (
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.startsWith('-')
  ) {
    return 'El dominio del correo no es válido.'
  }
  if (domain.includes('..')) {
    return 'El dominio no puede tener puntos seguidos.'
  }
  if (!domain.includes('.')) {
    return 'El dominio debe incluir una extensión (ej. .com, .cl).'
  }

  const domainLabels = domain.split('.').filter(Boolean)
  const tld = domainLabels[domainLabels.length - 1] ?? ''
  if (tld.length < 2 || tld.length > 63) {
    return 'Introduce una extensión de dominio válida (ej. .cl, .com).'
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(tld)) {
    return 'La extensión del dominio no es válida.'
  }

  if (!EMAIL_FULL_RE.test(email)) {
    return 'Introduce un correo electrónico con caracteres válidos.'
  }
  return null
}

export function validateRegisterName(name: string): string | null {
  const t = name.trim()
  if (t.length < NAME_MIN)
    return `El nombre debe tener al menos ${NAME_MIN} caracteres.`
  if (t.length > NAME_MAX)
    return `El nombre no puede superar ${NAME_MAX} caracteres.`
  return null
}

export function getPasswordRuleMessages(): string[] {
  return [
    `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres (sin espacios)`,
    'Al menos una letra mayúscula y una minúscula',
    'Al menos un número',
    'Al menos un carácter especial (!@#$%^&*…)',
    'No puede ser una contraseña muy común'
  ]
}

export type PasswordRuleStatus = { key: string; label: string; ok: boolean }

/** Estado por regla para checklist en UI (misma lógica que validatePasswordStrength). */
export function getPasswordRuleChecks(password: string): PasswordRuleStatus[] {
  const lenOk =
    password.length >= PASSWORD_MIN &&
    password.length <= PASSWORD_MAX &&
    !/[\s\n\r\t]/.test(password)
  const caseOk = /[a-z]/.test(password) && /[A-Z]/.test(password)
  const digitOk = /[0-9]/.test(password)
  const specialOk = SPECIAL_RE.test(password)
  const notWeakOk =
    password.length > 0 && !WEAK_PASSWORDS.has(password.toLowerCase())

  const labels = getPasswordRuleMessages()
  return [
    { key: 'length', label: labels[0]!, ok: lenOk },
    { key: 'case', label: labels[1]!, ok: caseOk },
    { key: 'digit', label: labels[2]!, ok: digitOk },
    { key: 'special', label: labels[3]!, ok: specialOk },
    { key: 'notWeak', label: labels[4]!, ok: notWeakOk }
  ]
}

export function isPasswordStrengthSatisfied(password: string): boolean {
  return getPasswordRuleChecks(password).every(r => r.ok)
}

export function validatePasswordStrength(password: string): string | null {
  if (!password) return 'La contraseña es obligatoria.'
  if (password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`
  }
  if (password.length > PASSWORD_MAX) {
    return `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`
  }
  if (/[\s\n\r\t]/.test(password)) {
    return 'La contraseña no puede contener espacios en blanco.'
  }
  if (!/[a-z]/.test(password)) return 'Incluye al menos una letra minúscula.'
  if (!/[A-Z]/.test(password)) return 'Incluye al menos una letra mayúscula.'
  if (!/[0-9]/.test(password)) return 'Incluye al menos un número.'
  if (!SPECIAL_RE.test(password)) {
    return 'Incluye al menos un carácter especial (por ejemplo ! @ # $ % …).'
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return 'Elige una contraseña menos predecible.'
  }
  return null
}
