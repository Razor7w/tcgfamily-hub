/**
 * Parsea texto de cartel / WhatsApp para crear un evento de cartelera en admin.
 * Cupo: solo si el texto menciona cupo/plazas explícitas; si no, se usa el máximo permitido (ilimitado práctico).
 */

export const WEEKLY_EVENT_PARTICIPANTS_MAX = 2048

/** Plantilla de ejemplo para el modal «Pegar evento» en admin. */
export const DEFAULT_PASTE_EVENT_FLYER_TEMPLATE = `Torneo ESTANDAR TCG Family
SABADO 18 DE ABRIL 17:00
Rondas BO3 según cantidad de participantes
Valor $3.000
1/2 Sobre al pozo de Equilibrio Perfecto por jugador inscrito.
Sobre de Liga para el top 50% (máx 8)
Lugar: Av. Valparaiso 1195, Local 3
Cupos 16`

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11
}

function stripDiacritics(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseClpNumber(raw: string): number {
  const digits = raw.replace(/\./g, '').replace(/\s/g, '').replace(/[^\d]/g, '')
  const n = parseInt(digits, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Línea tipo "Valor $3.000" o "$ 3.000" */
function priceFromLine(line: string): number | null {
  const t = line.trim()
  if (/^valor\b/i.test(t)) {
    const after = t.replace(/^valor\b/i, '').trim()
    const m = after.match(/\$?\s*([\d.\s]+)/)
    if (m) {
      const n = parseClpNumber(m[1])
      return n > 0 ? n : 0
    }
  }
  if (/^\$\s*[\d.]/.test(t)) {
    const n = parseClpNumber(t)
    return n
  }
  return null
}

/**
 * Detecta cupo solo en líneas dedicadas (evita "(máx 8)" en premios tipo top %).
 */
function parseCupoFromLine(line: string): number | null {
  const t = line.trim()
  const lower = stripDiacritics(t)

  if (/\btop\s+\d+%/.test(lower) && /\bmax\b/.test(lower)) {
    return null
  }

  let m = t.match(/^\s*cupo(?:\s+m[aá]ximo|\s+max)?\s*:?\s*(\d+)/i)
  if (m) return parseInt(m[1], 10)

  m = t.match(/^\s*cupos\s*:?\s*(\d+)\s*$/i)
  if (m) return parseInt(m[1], 10)

  m = t.match(/^\s*cupo\s+de\s+(\d+)/i)
  if (m) return parseInt(m[1], 10)

  m = t.match(/^\s*hasta\s+(\d+)\s+(jugadores|participantes|personas|inscri)/i)
  if (m) return parseInt(m[1], 10)

  m = t.match(/^\s*(\d+)\s+plazas?\s*$/i)
  if (m) return parseInt(m[1], 10)

  m = t.match(/^\s*plazas?\s*:?\s*(\d+)\s*$/i)
  if (m) return parseInt(m[1], 10)

  return null
}

const DATE_LINE_RE =
  /(?:[a-záéíóúñ]+\s+)?(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(\d{4}))?(?:\s+(\d{1,2})[.:](\d{2}))?/i

function parseDateLine(line: string, now: Date): Date | null {
  const m = line.match(DATE_LINE_RE)
  if (!m) return null

  const day = parseInt(m[1], 10)
  const monthKey = stripDiacritics(m[2])
  const month = MONTHS[monthKey]
  if (month === undefined || day < 1 || day > 31) return null

  const year = m[3] !== undefined ? parseInt(m[3], 10) : now.getFullYear()
  const hh = m[4] !== undefined ? parseInt(m[4], 10) : 12
  const mm = m[5] !== undefined ? parseInt(m[5], 10) : 0

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null

  const d = new Date(year, month, day, hh, mm, 0, 0)
  if (Number.isNaN(d.getTime())) return null

  // Sin año en el texto: solo se usa el año calendario actual (`now`), sin pasar al año siguiente
  // aunque esa fecha ya haya pasado (el admin puede corregir la línea o editar en el formulario).

  return d
}

const FORMAT_HINT =
  /\b(ronda|rondas|bo\s*\d|suizo|swiss|emparej|eliminaci|formato|mejor\s+de)\b/i

function isLocationLine(line: string): boolean {
  return /^\s*lugar\s*:/i.test(line.trim())
}

function locationFromLine(line: string): string {
  return line.replace(/^\s*lugar\s*:\s*/i, '').trim()
}

export type ParsedFlyerForCreate =
  | {
      ok: true
      payload: Record<string, unknown>
    }
  | { ok: false; error: string }

/**
 * Convierte texto pegado en cuerpo JSON para POST /api/admin/events.
 * Defaults: torneo Pokémon casual, estado programado, ronda 0.
 */
export function parsePastedEventFlyer(
  raw: string,
  now = new Date()
): ParsedFlyerForCreate {
  const text = raw.trim()
  if (!text) {
    return { ok: false, error: 'Pega el texto del cartel.' }
  }

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length === 0) {
    return { ok: false, error: 'Pega el texto del cartel.' }
  }

  const title = lines[0].slice(0, 200)
  if (!title) {
    return { ok: false, error: 'No se pudo leer el título (primera línea).' }
  }

  let dateAt: Date | null = null
  let dateLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseDateLine(lines[i], now)
    if (parsed) {
      dateAt = parsed
      dateLineIndex = i
      break
    }
  }

  if (!dateAt) {
    return {
      ok: false,
      error:
        'No se encontró una fecha reconocible. Usa una línea como «SÁBADO 18 DE ABRIL 17:00» o «18 DE ABRIL 2026 17:00».'
    }
  }

  let priceClp = 0
  let location = ''
  let cupo: number | null = null

  const formatLines: string[] = []
  const prizeLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    if (i === 0) continue
    const line = lines[i]
    if (i === dateLineIndex) continue

    const cup = parseCupoFromLine(line)
    if (cup !== null) {
      cupo = cup
      continue
    }

    if (isLocationLine(line)) {
      location = locationFromLine(line).slice(0, 500)
      continue
    }

    const pv = priceFromLine(line)
    if (pv !== null) {
      priceClp = pv
      continue
    }

    if (FORMAT_HINT.test(line)) {
      formatLines.push(line)
      continue
    }

    if (/^\s*valor\b/i.test(line)) {
      continue
    }

    prizeLines.push(line)
  }

  const formatNotes = formatLines.join('\n').slice(0, 2000)
  const prizesNotes = prizeLines.join('\n').slice(0, 2000)

  let maxParticipants = WEEKLY_EVENT_PARTICIPANTS_MAX
  if (cupo !== null) {
    const n = Math.round(cupo)
    if (n >= 1 && n <= WEEKLY_EVENT_PARTICIPANTS_MAX) {
      maxParticipants = n
    }
  }

  const payload: Record<string, unknown> = {
    startsAt: dateAt.toISOString(),
    title,
    state: 'schedule',
    kind: 'tournament',
    game: 'pokemon',
    pokemonSubtype: 'casual',
    priceClp,
    maxParticipants,
    formatNotes,
    prizesNotes,
    location,
    roundNum: 0
  }

  return { ok: true, payload }
}
