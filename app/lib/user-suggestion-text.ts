const MIN_LEN = 3
const MAX_LEN = 2000

export function normalizeUserSuggestionText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (t.length < MIN_LEN) return null
  if (t.length > MAX_LEN) return t.slice(0, MAX_LEN)
  return t
}

export const USER_SUGGESTION_MIN_LEN = MIN_LEN
export const USER_SUGGESTION_MAX_LEN = MAX_LEN
