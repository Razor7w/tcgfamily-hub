export const CARD_SINGLE_LANGUAGES = [
  'EN',
  'ES',
  'JA',
  'KO',
  'ZH',
  'FR',
  'DE',
  'IT',
  'PT'
] as const

export type CardSingleLanguage = (typeof CARD_SINGLE_LANGUAGES)[number]

export const CARD_SINGLE_LANGUAGE_LABELS: Record<CardSingleLanguage, string> = {
  EN: 'Inglés',
  ES: 'Español',
  JA: 'Japonés',
  KO: 'Coreano',
  ZH: 'Chino',
  FR: 'Francés',
  DE: 'Alemán',
  IT: 'Italiano',
  PT: 'Portugués'
}

export function isCardSingleLanguage(
  value: unknown
): value is CardSingleLanguage {
  return (
    typeof value === 'string' &&
    (CARD_SINGLE_LANGUAGES as readonly string[]).includes(value)
  )
}

/** Sugerencia al elegir carta Limitless (región `jp` → japonés). */
export function suggestLanguageFromRegion(
  region: string | null | undefined
): CardSingleLanguage {
  const r = String(region ?? '')
    .trim()
    .toLowerCase()
  if (r === 'jp' || r === 'jpn' || r === 'ja') return 'JA'
  return 'EN'
}
