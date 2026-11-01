import { formatRutOnBlur } from '@/lib/rut-input'

/**
 * QR de cédula chilena (Registro Civil) leído con pistola de código de barras.
 * La pistola escribe como teclado. Con layout distinto, la URL llega así:
 * `httpsÑ--portal...RUN¡20185071'1/type¡CEDULA...`
 * (`¡` es `=`, `'` es el guion del RUT). El RUT es el cuerpo hasta esa comilla
 * y el dígito verificador que viene justo después: `20185071-1`.
 */
const MANGLED_RUN = /RUN¡(\d{7,8})['\u2019\u00B4]([0-9kK])/

const PLAIN_RUN = /RUN=(\d{7,8})-([0-9kK])/i

export function rutFromCedulaQrScan(raw: string): string | null {
  const text = raw.trim()
  if (!/^https/i.test(text)) return null

  const match = text.match(MANGLED_RUN) ?? text.match(PLAIN_RUN)
  if (!match) return null

  const body = match[1]
  const dv = match[2].toUpperCase()
  const plain = `${body}-${dv}`
  const formatted = formatRutOnBlur(plain)
  return formatted || plain
}
