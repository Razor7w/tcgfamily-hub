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

/** Normaliza para cabeceras de sección (p. ej. «Entrenador» / «Energía») sin depender de acentos. */
function normalizeSectionKey(raw: string): string {
  return raw.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function normalizeSectionId(raw: string): DeckSectionId {
  const v = normalizeSectionKey(raw)
  if (v.startsWith('pok')) return 'pokemon'
  if (v.startsWith('train') || v.startsWith('entrenad')) return 'trainer'
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

export type DecklistFlatCard = {
  count: number
  name: string
  set: string
  number: number
}

/** Cartas únicas (set+número) con conteos sumados, para la vista en imágenes. */
export function flatCardsFromDecklistText(value: string): DecklistFlatCard[] {
  const parsed = parseDecklistText(value)
  const all = parsed.sections.flatMap(s => s.cards)
  const map = new Map<string, DecklistFlatCard>()
  for (const c of all) {
    const key = `${c.set}-${c.number}`
    const prev = map.get(key)
    if (prev) prev.count += c.count
    else
      map.set(key, {
        count: c.count,
        set: c.set,
        number: c.number,
        name: c.name
      })
  }
  return Array.from(map.values())
}

/**
 * El CDN de Limitless usa códigos de carpeta distintos a los impresos en carta en algunos casos.
 * Las Scarlet/Violet promos en decklist suelen venir como `PR-SV`; en el CDN son `SVP`.
 */
function limitlessCdnSetCode(rawSet: string): string {
  const u = rawSet.trim().toUpperCase()
  if (u === 'PR-SV' || u === 'PRSV') return 'SVP'
  return u
}

/**
 * Códigos de set (p. ej. en decklists / API) → id de set en images.pokemontcg.io.
 * El patrón del CDN de Limitless (`SET_###`) no aplica: el número allí no va con ceros a
 * la izquierda como tpci, y además el slug difiere.
 */
const POKEMON_TCG_IO_SET_ID: Readonly<Record<string, string>> = {
  N1: 'neo1',
  N2: 'neo2',
  E2: 'ecard2',
  TRR: 'ex7',
  UF: 'ex10',
  DF: 'ex15',
  SW: 'dp3'
}

function isAllDigitsString(s: string): boolean {
  return /^\d+$/.test(s.trim())
}

/**
 * Código de tipo para energía básica en tpci (SUM/…_&lt;LETRA&gt;_R_EN_…), p. ej. G → Grass.
 * Cubre nombres tipo `Basic {G} Energy` o `Basic Grass Energy`.
 */
function basicTpciEnergyLetterFromName(name: string): string | null {
  const n = name.trim()
  const brace = n.match(/Basic\s*\{([A-Z])\}\s*Energy/i)
  if (brace?.[1]) return brace[1].toUpperCase()
  const oneLetter = n.match(/Basic\s+([A-Z])\s+Energy/i)
  if (oneLetter?.[1]) return oneLetter[1].toUpperCase()
  const w = n.match(
    /Basic\s+(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Fairy)\s+Energy/i
  )
  if (w?.[1]) {
    const map: Record<string, string> = {
      Grass: 'G',
      Fire: 'R',
      Water: 'W',
      Lightning: 'L',
      Psychic: 'P',
      Fighting: 'F',
      Darkness: 'D',
      Metal: 'M',
      Fairy: 'Y'
    }
    return map[w[1]] ?? null
  }
  return null
}

function isDecklistEnergySetToken(set: string): boolean {
  const k = normalizeSectionKey(set)
  return k === 'energy' || k === 'energia'
}

/**
 * Thumbnail o arte completo: Limitless tpci (`SET_###_R_EN_SM|LG.png`), o images.pokemontcg.io
 * para sets clásicos, o patrón HIF Shiny Vault (`HIF_SV#_R_EN_XS|LG.png`) en el CDN Limitless.
 *
 * @param cardName Nombre de la carta (p. ej. desde el decklist) para corregir energía básica
 *  cuando el set se parseó como `Energy` y el tpci usa `SUM_&lt;tipo&gt;_R_EN_…` en vez de
 *  `ENERGY_009_…`.
 */
export function limitlessCardImageUrl(args: {
  set: string
  number: string | number
  size?: 'SM' | 'LG'
  lang?: 'EN'
  cardName?: string
}): string {
  const setRaw = args.set.trim()
  const setU = setRaw.toUpperCase()
  const setFolder = limitlessCdnSetCode(setRaw)
  const numStr = String(args.number).trim()
  const size = args.size ?? 'LG'
  const lang = args.lang ?? 'EN'

  const fromName = (args.cardName ?? '').trim()
  if (fromName && isDecklistEnergySetToken(setU)) {
    const letter = basicTpciEnergyLetterFromName(fromName)
    if (letter) {
      // Sun & Moon — energía básica en tpci (p. ej. SUM_G_R_EN_XS.png); el «set» en texto pleno
      // a veces es `Energy` + número, no un código de producto tpci.
      const folder = 'SUM'
      const imgSize = size === 'SM' ? 'XS' : 'LG'
      return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${folder}/${folder}_${letter}_R_${lang}_${imgSize}.png`
    }
  }

  const ptcgId = POKEMON_TCG_IO_SET_ID[setU]
  if (ptcgId) {
    return `https://images.pokemontcg.io/${ptcgId}/${numStr.toLowerCase()}.png`
  }

  // Hidden Fates — Shiny Vault: numeración SV9, etc.; en tpci no es ### con padding.
  if (setU === 'HIF' && !isAllDigitsString(numStr)) {
    const imgSize = size === 'SM' ? 'XS' : 'LG'
    return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${setFolder}/${setFolder}_${numStr.toUpperCase()}_R_${lang}_${imgSize}.png`
  }

  if (isAllDigitsString(numStr)) {
    const num = numStr.padStart(3, '0')
    return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${setFolder}/${setFolder}_${num}_R_${lang}_${size}.png`
  }

  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/${setFolder}/${setFolder}_${numStr.toUpperCase()}_R_${lang}_${size}.png`
}
