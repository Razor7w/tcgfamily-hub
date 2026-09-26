/**
 * Arma enlace wa.me desde un teléfono chileno (u otro E.164 parcial).
 * Devuelve null si no hay dígitos suficientes.
 * @param text Mensaje opcional (se añade como `?text=`).
 */
export function buildWhatsAppHref(phone: string, text?: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  let e164 = digits
  if (digits.length === 9 && digits.startsWith('9')) {
    e164 = `56${digits}`
  } else if (digits.length === 11 && digits.startsWith('569')) {
    e164 = digits
  } else if (digits.length === 8) {
    e164 = `569${digits}`
  } else if (digits.startsWith('56') && digits.length >= 11) {
    e164 = digits
  } else if (digits.length < 8) {
    return null
  }

  const base = `https://wa.me/${e164}`
  const msg = typeof text === 'string' ? text.trim() : ''
  if (!msg) return base
  return `${base}?text=${encodeURIComponent(msg)}`
}

export type InterestListLine = {
  name: string
  set: string
  number: string
  languageLabel: string
  conditionLabel: string
  quantity: number
  priceClp: number
}

function formatClp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(n)
}

/** Texto listo para copiar / WhatsApp con idioma, valor y total. */
export function buildInterestListMessage(
  lines: InterestListLine[],
  opts?: { binderName?: string; sellerName?: string }
): string {
  if (!lines.length) return ''
  const headerBits = ['Hola']
  if (opts?.sellerName?.trim()) headerBits.push(opts.sellerName.trim())
  let out = `${headerBits.join(' ')}! Me interesan estas cartas`
  if (opts?.binderName?.trim()) {
    out += ` de «${opts.binderName.trim()}»`
  }
  out += ':\n\n'

  let total = 0
  for (const line of lines) {
    const qty = Math.max(1, Math.round(line.quantity) || 1)
    const unit = Math.max(0, Math.round(line.priceClp) || 0)
    const sub = unit * qty
    total += sub
    const qtyPart = qty > 1 ? ` · x${qty}` : ''
    const unitPart =
      qty > 1 ? `${formatClp(unit)} c/u = ${formatClp(sub)}` : formatClp(unit)
    out += `• ${line.name} (${line.set} ${line.number}) · ${line.languageLabel} · ${line.conditionLabel}${qtyPart} · ${unitPart}\n`
  }
  out += `\nTotal: ${formatClp(total)}`
  return out.trim()
}
