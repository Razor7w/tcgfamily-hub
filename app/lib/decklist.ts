export type DeckSectionId = 'pokemon' | 'trainer' | 'energy' | 'other'

export type DeckCardLine = {
  count: number
  name: string
  set: string
  number: number
}

export type DeckSection = {
  id: DeckSectionId
  title: string
  declaredTotal?: number
  cards: DeckCardLine[]
}

export type ParsedDecklist = {
  sections: DeckSection[]
  unknownLines: string[]
}

function normalizeSectionId(raw: string): DeckSectionId {
  const v = raw.trim().toLowerCase()
  if (v.startsWith('pok')) return 'pokemon'
  if (v.startsWith('train')) return 'trainer'
  if (v.startsWith('ener')) return 'energy'
  return 'other'
}

function canonicalSectionTitle(id: DeckSectionId, rawTitle?: string): string {
  if (id === 'pokemon') return 'Pokémon'
  if (id === 'trainer') return 'Trainer'
  if (id === 'energy') return 'Energy'
  return rawTitle?.trim() || 'Otros'
}

function toIntSafe(s: string): number | null {
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

function parseHeaderLine(
  line: string
): { title: string; total?: number } | null {
  // Examples:
  // "Pokémon: 21"
  // "Trainer: 31"
  // "Energy: 8"
  const m = line.match(/^\s*([^:]+)\s*:\s*(\d+)\s*$/)
  if (!m) return null
  const title = m[1]?.trim() || ''
  const total = toIntSafe(m[2] || '')
  return { title, total: total ?? undefined }
}

function parseCardLine(line: string): DeckCardLine | null {
  // Expected format:
  // "<count> <name...> <SET> <number>"
  //
  // Examples:
  // "4 Cynthia's Gible DRI 102"
  // "1 Neo Upper Energy TEF 162"
  //
  // We assume the last two tokens are set + number.
  const trimmed = line.trim()
  if (!trimmed) return null

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length < 4) return null

  const count = toIntSafe(parts[0] || '')
  if (!count || count <= 0) return null

  const set = (parts[parts.length - 2] || '').toUpperCase()
  const number = toIntSafe(parts[parts.length - 1] || '')
  if (!set || !number || number <= 0) return null

  const name = parts.slice(1, -2).join(' ').trim()
  if (!name) return null

  return { count, name, set, number }
}

export function parseDecklistText(input: string): ParsedDecklist {
  const lines = input
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const sections: DeckSection[] = []
  const unknownLines: string[] = []

  let current: DeckSection | null = null

  const ensureSection = (rawTitle: string, declaredTotal?: number) => {
    const id = normalizeSectionId(rawTitle)
    const title = canonicalSectionTitle(id, rawTitle)
    const existing = sections.find(s => s.id === id && s.title === title)
    if (existing) {
      current = existing
      if (declaredTotal && !existing.declaredTotal)
        existing.declaredTotal = declaredTotal
      return
    }
    const next: DeckSection = { id, title, declaredTotal, cards: [] }
    sections.push(next)
    current = next
  }

  for (const line of lines) {
    const header = parseHeaderLine(line)
    if (header) {
      ensureSection(header.title, header.total)
      continue
    }

    const card = parseCardLine(line)
    if (card) {
      if (!current) {
        ensureSection('Otros')
      }
      current!.cards.push(card)
      continue
    }

    unknownLines.push(line)
  }

  const order: DeckSectionId[] = ['pokemon', 'trainer', 'energy', 'other']
  sections.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

  return { sections, unknownLines }
}

export function limitlessCardImageUrl(args: {
  set: string
  number: number
  size?: 'SM' | 'LG'
  lang?: 'EN'
}): string {
  const set = args.set.toUpperCase()
  const num = String(args.number).padStart(3, '0')
  const size = args.size ?? 'LG'
  const lang = args.lang ?? 'EN'

  // Observed pattern from og:image on card pages:
  // https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/DRI/DRI_007_R_EN_SM.png
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${set}/${set}_${num}_R_${lang}_${size}.png`
}
