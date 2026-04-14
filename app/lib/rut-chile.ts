import { canonicalRut } from '@/lib/store-points-csv'

/** Dígito verificador módulo 11 (RUT chileno). */
export function chileRutVerificationDigit(bodyDigits: string): string {
  let sum = 0
  let mul = 2
  for (let i = bodyDigits.length - 1; i >= 0; i--) {
    sum += parseInt(bodyDigits[i]!, 10) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const r = 11 - (sum % 11)
  if (r === 11) return '0'
  if (r === 10) return 'K'
  return String(r)
}

/** null = válido; string = mensaje de error. */
export function validateRutChile(raw: string): string | null {
  const t = raw.trim()
  if (!t) return 'El RUT es obligatorio.'
  const canon = canonicalRut(t)
  if (!canon) {
    return 'Introduce un RUT válido (ej. 12.345.678-9).'
  }
  const [body, dv] = canon.split('-')
  if (!body || !dv) {
    return 'Introduce un RUT válido (ej. 12.345.678-9).'
  }
  const expected = chileRutVerificationDigit(body)
  if (dv !== expected) {
    return 'El RUT no es válido (dígito verificador incorrecto).'
  }
  return null
}

/** Formato canónico para guardar en BD (`12345678-9`). */
export function rutForStorage(raw: string): string {
  return canonicalRut(raw) || raw.trim().replace(/\s+/g, '')
}

const POPID_MAX = 64

export function validatePopidOptional(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (t.length > POPID_MAX) {
    return `El Pop ID no puede superar ${POPID_MAX} caracteres.`
  }
  return null
}

export function popidForStorage(raw: string): string {
  return raw.trim().slice(0, POPID_MAX)
}
