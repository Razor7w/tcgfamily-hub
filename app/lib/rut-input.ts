import { clean, format, validate } from 'rut.js'

/** Mensaje de error para inputs de RUT (usa rut.js). `required` solo aplica si el campo está vacío. */
export function getRutFieldError(
  raw: string,
  required: boolean
): string | null {
  const t = raw.trim()
  if (!t) return required ? 'El RUT es obligatorio.' : null
  if (!validate(t)) return 'RUT inválido.'
  return null
}

/** Formatea al blur (puntos + guión). Si no es válido, devuelve el texto tal cual. */
export function formatRutOnBlur(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  try {
    if (!validate(t)) return raw
    return format(clean(t))
  } catch {
    return raw
  }
}

/** Solo dígitos, recortado a `maxLen`. */
export function onlyDigits(raw: string, maxLen: number): string {
  return raw.replace(/\D/g, '').slice(0, maxLen)
}
