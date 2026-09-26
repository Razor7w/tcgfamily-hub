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
  /** Si es foto lotes, no lleva set/número/idioma/estado/precio. */
  kind?: 'single' | 'photo'
  set?: string
  number?: string
  languageLabel?: string
  conditionLabel?: string
  quantity?: number
  priceClp?: number
  description?: string
  binderName?: string
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
  let hasPriced = false
  for (const line of lines) {
    const binderPart = line.binderName?.trim()
      ? ` · ${line.binderName.trim()}`
      : ''

    if (line.kind === 'photo') {
      const desc = line.description?.trim()
      const descPart = desc ? ` · ${desc}` : ''
      out += `• ${line.name} (foto)${binderPart}${descPart}\n`
      continue
    }

    const qty = Math.max(1, Math.round(line.quantity ?? 1) || 1)
    const unit = Math.max(0, Math.round(line.priceClp ?? 0) || 0)
    const sub = unit * qty
    total += sub
    hasPriced = true
    const qtyPart = qty > 1 ? ` · x${qty}` : ''
    const unitPart =
      qty > 1 ? `${formatClp(unit)} c/u = ${formatClp(sub)}` : formatClp(unit)
    const setNum =
      line.set || line.number
        ? ` (${[line.set, line.number].filter(Boolean).join(' ')})`
        : ''
    const lang = line.languageLabel ? ` · ${line.languageLabel}` : ''
    const cond = line.conditionLabel ? ` · ${line.conditionLabel}` : ''
    out += `• ${line.name}${setNum}${binderPart}${lang}${cond}${qtyPart} · ${unitPart}\n`
  }
  if (hasPriced) {
    out += `\nTotal: ${formatClp(total)}`
  }
  return out.trim()
}
