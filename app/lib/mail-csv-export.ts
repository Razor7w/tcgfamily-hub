import { getMailStatusChip } from '@/lib/mail-status'
import { getMailStoreWaitDays } from '@/lib/mail-store-days'
import { santiagoDayKey } from '@/lib/santiago-day-key'

const CSV_SEP = ';'
const CHILE_TZ = 'America/Santiago'

export const MAIL_CSV_HEADERS = [
  'codigo',
  'estado',
  'fecha_registro',
  'fecha_ingreso_tienda',
  'fecha_actualizacion',
  'dias_en_tienda',
  'remitente_nombre',
  'remitente_rut',
  'remitente_email',
  'remitente_telefono',
  'destinatario_nombre',
  'destinatario_rut',
  'destinatario_email',
  'destinatario_telefono',
  'destinatario_tiene_cuenta',
  'numero_contacto',
  'recibido_en_tienda',
  'retirado',
  'observaciones',
  'id'
] as const

type PopulatedUserSlice = {
  name: string
  rut: string
  email: string
  phone: string
}

function csvEscape(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function yesNo(value: boolean): string {
  return value ? 'Sí' : 'No'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function strField(obj: Record<string, unknown> | null, key: string): string {
  if (!obj) return ''
  const v = obj[key]
  return typeof v === 'string' ? v.trim() : ''
}

function populatedUser(ref: unknown): PopulatedUserSlice {
  const obj = asRecord(ref)
  if (!obj) {
    return { name: '', rut: '', email: '', phone: '' }
  }
  return {
    name: strField(obj, 'name'),
    rut: strField(obj, 'rut'),
    email: strField(obj, 'email'),
    phone: strField(obj, 'phone')
  }
}

function hasLinkedUser(ref: unknown): boolean {
  if (ref == null) return false
  if (typeof ref === 'string') return ref.trim().length > 0
  const obj = asRecord(ref)
  if (!obj) return false
  if (obj._id != null && String(obj._id).trim() !== '') return true
  return populatedUser(ref).name !== '' || populatedUser(ref).rut !== ''
}

/** Fecha/hora fija Chile para Excel (`dd-mm-yyyy hh:mm:ss`). */
export function formatMailCsvDateTime(
  isoOrDate: string | Date | null | undefined
): string {
  if (isoOrDate == null) return ''
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CHILE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? ''
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`
}

export function mailCsvFilename(now: Date = new Date()): string {
  return `correos-${santiagoDayKey(now)}.csv`
}

export function parseContentDispositionFilename(
  header: string | null
): string | null {
  if (!header) return null
  const star = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      return star[1]
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i)
  if (quoted?.[1]) return quoted[1]
  const plain = header.match(/filename=([^;]+)/i)
  return plain?.[1]?.trim() ?? null
}

function mailToCsvCells(mail: unknown): string[] {
  const row = asRecord(mail) ?? {}
  const from = populatedUser(row.fromUserId)
  const to = populatedUser(row.toUserId)
  const toRut = to.rut || strField(row, 'toRut')
  const isRecived = row.isRecived === true
  const isRecivedInStore = row.isRecivedInStore === true
  const receivedInStoreAt =
    row.receivedInStoreAt instanceof Date
      ? row.receivedInStoreAt
      : typeof row.receivedInStoreAt === 'string'
        ? row.receivedInStoreAt
        : null
  const createdAt =
    row.createdAt instanceof Date
      ? row.createdAt
      : typeof row.createdAt === 'string'
        ? row.createdAt
        : null
  const updatedAt =
    row.updatedAt instanceof Date
      ? row.updatedAt
      : typeof row.updatedAt === 'string'
        ? row.updatedAt
        : null
  const waitDays = getMailStoreWaitDays({
    isRecived,
    isRecivedInStore,
    receivedInStoreAt
  })

  return [
    strField(row, 'code'),
    getMailStatusChip({ isRecived, isRecivedInStore }).label,
    formatMailCsvDateTime(createdAt),
    formatMailCsvDateTime(receivedInStoreAt),
    formatMailCsvDateTime(updatedAt),
    waitDays == null ? '' : String(waitDays),
    from.name,
    from.rut,
    from.email,
    from.phone,
    to.name,
    toRut,
    to.email,
    to.phone,
    yesNo(hasLinkedUser(row.toUserId)),
    strField(row, 'contactPhone'),
    yesNo(isRecivedInStore),
    yesNo(isRecived),
    strField(row, 'observations'),
    row._id != null ? String(row._id) : ''
  ]
}

/** CSV UTF-8 con BOM y `;` (Excel es-CL). */
export function buildMailsCsv(mails: unknown[]): string {
  const lines = [
    MAIL_CSV_HEADERS.join(CSV_SEP),
    ...mails.map(mail => mailToCsvCells(mail).map(csvEscape).join(CSV_SEP))
  ]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
