import {
  CARD_SINGLE_CONDITION_LABELS,
  type CardSingleCondition,
  isCardSingleCondition
} from '@/lib/card-single-condition'
import {
  CARD_SINGLE_LANGUAGE_LABELS,
  type CardSingleLanguage,
  isCardSingleLanguage
} from '@/lib/card-single-language'

export type ParsedInterestLine = {
  name: string
  set: string
  number: string
  binderName: string | null
  language: CardSingleLanguage | null
  condition: CardSingleCondition | null
  quantity: number
  priceClp: number | null
  raw: string
}

const LANGUAGE_BY_LABEL = new Map(
  Object.entries(CARD_SINGLE_LANGUAGE_LABELS).map(([code, label]) => [
    label.toLowerCase(),
    code as CardSingleLanguage
  ])
)

const CONDITION_BY_LABEL = new Map(
  Object.entries(CARD_SINGLE_CONDITION_LABELS).map(([code, label]) => [
    label.toLowerCase(),
    code as CardSingleCondition
  ])
)

function parseClpAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
  const n = Math.round(Number(cleaned))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function extractNameSetNumber(head: string): {
  name: string
  set: string
  number: string
} | null {
  const m = head.trim().match(/^(.+?)\s+\(([A-Za-z0-9-]+)\s+([^)]+)\)\s*$/)
  if (!m) return null
  return {
    name: m[1].trim(),
    set: m[2].trim().toUpperCase(),
    number: m[3].trim()
  }
}

/**
 * Parsea el texto generado por `buildInterestListMessage` (también si viene
 * en una sola línea pegada desde WhatsApp).
 */
export function parseInterestListMessage(text: string): ParsedInterestLine[] {
  const raw = String(text ?? '').trim()
  if (!raw) return []

  const chunks = raw
    .split(/[•●]/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !/^hola\b/i.test(s) && !/^total:/i.test(s))

  const out: ParsedInterestLine[] = []

  for (const chunk of chunks) {
    // Quitar cola de "Total: ..." si quedó pegada al último ítem
    const line = chunk.replace(/\s*Total:\s*\$?[\d.\s]+$/i, '').trim()
    if (!line.includes('·') && !line.includes('(')) continue

    const parts = line
      .split(/\s*·\s*/)
      .map(p => p.trim())
      .filter(Boolean)
    if (parts.length < 3) continue

    const head = extractNameSetNumber(parts[0])
    if (!head) continue

    let languageIdx = -1
    let language: CardSingleLanguage | null = null
    for (let i = 1; i < parts.length; i++) {
      const code = LANGUAGE_BY_LABEL.get(parts[i].toLowerCase())
      if (code) {
        languageIdx = i
        language = code
        break
      }
    }
    if (languageIdx < 0) continue

    const binderName =
      languageIdx > 1
        ? parts.slice(1, languageIdx).join(' · ').trim() || null
        : null

    const afterLang = parts.slice(languageIdx + 1)
    if (!afterLang.length) continue

    let condition: CardSingleCondition | null = null
    let quantity = 1
    let priceClp: number | null = null

    const conditionPart = afterLang[0]
    const condCode =
      CONDITION_BY_LABEL.get(conditionPart.toLowerCase()) ??
      (isCardSingleCondition(conditionPart) ? conditionPart : null)
    if (condCode) condition = condCode

    for (let i = 1; i < afterLang.length; i++) {
      const p = afterLang[i]
      const qtyM = p.match(/^x\s*(\d+)$/i)
      if (qtyM) {
        quantity = Math.max(1, Math.round(Number(qtyM[1])) || 1)
        continue
      }
      // "$2.000" o "$2.000 c/u = $6.000" → usamos precio unitario
      const unitM = p.match(/\$[\d.\s]+/)
      if (unitM) {
        priceClp = parseClpAmount(unitM[0])
      }
    }

    out.push({
      name: head.name,
      set: head.set,
      number: head.number,
      binderName,
      language: language && isCardSingleLanguage(language) ? language : null,
      condition,
      quantity,
      priceClp,
      raw: line
    })
  }

  return out
}

export function interestLineMatchScore(
  parsed: ParsedInterestLine,
  single: {
    name: string
    set: string
    number: string
    language: string
    condition: string
    priceClp: number
    binderName?: string
  }
): number {
  const setOk = single.set.toUpperCase() === parsed.set
  const numOk =
    String(single.number).trim().toUpperCase() ===
    String(parsed.number).trim().toUpperCase()
  if (!setOk || !numOk) return 0

  let score = 10
  if (parsed.language && single.language === parsed.language) score += 5
  if (parsed.condition && single.condition === parsed.condition) score += 5
  if (
    parsed.priceClp != null &&
    Math.round(single.priceClp) === parsed.priceClp
  ) {
    score += 3
  }
  if (parsed.binderName) {
    const a = parsed.binderName.trim().toLowerCase()
    const b = (single.binderName ?? '').trim().toLowerCase()
    if (a && b && a === b) score += 4
  }
  const nameA = parsed.name.trim().toLowerCase()
  const nameB = single.name.trim().toLowerCase()
  if (
    nameA &&
    nameB &&
    (nameA === nameB || nameB.includes(nameA) || nameA.includes(nameB))
  ) {
    score += 2
  }
  return score
}
