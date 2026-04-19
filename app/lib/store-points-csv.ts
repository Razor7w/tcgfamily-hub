/** Parsea líneas CSV con separador `;` y campos entre comillas (export Excel). */

export function parseCsvSemicolonLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ';' && !inQuotes) {
      cells.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  cells.push(cur)
  return cells.map(cell => {
    const t = cell.trim()
    if (t.startsWith('"') && t.endsWith('"')) {
      return t.slice(1, -1).replace(/""/g, '"')
    }
    return t
  })
}

/** Quita el prefijo de fórmula Excel `="…"` en RUT u otros campos. */
export function unwrapExcelText(value: string): string {
  const t = value.trim()
  const m = t.match(/^="(.+)"$/)
  if (m) {
    return m[1].replace(/^"+|"+$/g, '').trim()
  }
  return t.replace(/^"+|"+$/g, '').trim()
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/** Correo usable para cruce CSV ↔ BD; vacío si no hay correo real. */
export function normalizeEmailForPoints(value: string): string {
  const e = normalizeEmail(unwrapExcelText(value))
  if (!e) return ''
  const placeholders = new Set([
    '-',
    '—',
    'n/a',
    'na',
    's/c',
    'sin correo',
    'ninguno',
    'no aplica',
    'sin email'
  ])
  if (placeholders.has(e)) return ''
  return e
}

/** RUT chileno canónico `12345678-9` (sin puntos). */
export function canonicalRut(raw: string): string {
  const inner = unwrapExcelText(raw)
    .replace(/\./g, '')
    .replace(/-/g, '')
    .toUpperCase()
  if (inner.length < 2) return ''
  const body = inner.slice(0, -1)
  const dv = inner.slice(-1)
  if (!/^\d+$/.test(body) || !/^[0-9K]$/.test(dv)) return ''
  return `${body}-${dv}`
}

export function rutMatchVariants(canonical: string): string[] {
  if (!canonical) return []
  const [body, dv] = canonical.split('-')
  if (!body || !dv) return [canonical]
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return [canonical, `${body}${dv}`, `${withDots}-${dv}`]
}

export function parseNumberField(value: string): number {
  const n = parseInt(unwrapExcelText(value).replace(/\s/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function parseExpiryDate(value: string): Date | undefined {
  const t = unwrapExcelText(value)
  if (!t || /^n\/a$/i.test(t)) return undefined
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return undefined
  const d = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10) - 1
  const y = parseInt(m[3], 10)
  const dt = new Date(y, mo, d)
  return Number.isNaN(dt.getTime()) ? undefined : dt
}

export type PointsCsvRow = {
  rutRaw: string
  rut: string
  firstName: string
  lastName: string
  email: string
  saldo: number
  proximosVencer: number
  expiry?: Date
}

export type PointsCsvHeaderMap = {
  idxRut: number
  idxNombre: number
  idxApellido: number
  idxCorreo: number
  idxSaldo: number
  idxProximos: number
  idxFecha: number
}

export function mapHeaderRow(cells: string[]): PointsCsvHeaderMap | null {
  const lower = cells.map(c => unwrapExcelText(c).toLowerCase())
  const find = (sub: string) => lower.findIndex(h => h.includes(sub))
  const idxRut = find('rut cliente')
  const idxNombre = find('nombre del cliente')
  const idxApellido = find('apellido del cliente')
  const idxCorreo = find('correo')
  const idxSaldo = find('saldo')
  const idxProximos = find('proximos puntos')
  const idxFecha = find('fecha de vencimiento')
  if (
    idxRut < 0 ||
    idxNombre < 0 ||
    idxApellido < 0 ||
    idxCorreo < 0 ||
    idxSaldo < 0 ||
    idxProximos < 0 ||
    idxFecha < 0
  ) {
    return null
  }
  return {
    idxRut,
    idxNombre,
    idxApellido,
    idxCorreo,
    idxSaldo,
    idxProximos,
    idxFecha
  }
}

export function rowToPointsData(
  cells: string[],
  map: PointsCsvHeaderMap
): PointsCsvRow | null {
  const rut = canonicalRut(cells[map.idxRut] ?? '')
  const email = normalizeEmailForPoints(cells[map.idxCorreo] ?? '')
  const firstName = unwrapExcelText(cells[map.idxNombre] ?? '')
  const lastName = unwrapExcelText(cells[map.idxApellido] ?? '')
  if (!rut && !email) return null
  return {
    rutRaw: cells[map.idxRut] ?? '',
    rut,
    firstName,
    lastName,
    email,
    saldo: parseNumberField(cells[map.idxSaldo] ?? '0'),
    proximosVencer: parseNumberField(cells[map.idxProximos] ?? '0'),
    expiry: parseExpiryDate(cells[map.idxFecha] ?? '')
  }
}

export function displayName(row: PointsCsvRow): string {
  return (
    [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || 'Cliente'
  )
}
