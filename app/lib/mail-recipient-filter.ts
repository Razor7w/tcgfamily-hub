import { clean } from 'rut.js'

/** Clave estable para comparar variantes del mismo RUT (incluye DV K). */
export function rutCompareKey(raw: string | undefined | null): string {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  try {
    return clean(t).toUpperCase()
  } catch {
    return t.replace(/\s/g, '').toUpperCase()
  }
}

/** Emisor o receptor ya como usuario en BD. */
export type FilterFromUser = { id: string; name: string; rut: string }

export function filterFromUserLabel(u: FilterFromUser): string {
  return `${u.name || 'Sin nombre'} (${u.rut || '-'})`
}

/** Destinatario: usuario poblado en `toUserId` o solo texto `toRut` sin cuenta. */
export type FilterToRecipient =
  | { kind: 'user'; id: string; name: string; rut: string }
  | { kind: 'toRut'; id: string; rutDisplay: string; rutKey: string }

type FilterToRutOnly = Extract<FilterToRecipient, { kind: 'toRut' }>

export function filterToRecipientLabel(o: FilterToRecipient): string {
  if (o.kind === 'user') {
    return `${o.name || 'Sin nombre'} (${o.rut || '-'})`
  }
  return `${o.rutDisplay} · sin usuario en sistema`
}

function mailParticipantId(ref: unknown): string {
  if (ref == null) return ''
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    const id = (ref as { _id: unknown })._id
    return id != null ? String(id) : ''
  }
  return String(ref)
}

type MailParticipants = {
  fromUserId: unknown
  toUserId: unknown
  toRut?: string
}

/** Usuario únicos en `fromUserId` o `toUserId` para autocompletar “de” (y afines). */
export function buildDistinctMailUsersForFilters(
  mails: ReadonlyArray<MailParticipants>
): FilterFromUser[] {
  const map = new Map<string, FilterFromUser>()
  for (const m of mails) {
    for (const ref of [m.fromUserId, m.toUserId]) {
      if (ref == null) continue
      const id = mailParticipantId(ref)
      if (!id || map.has(id)) continue
      if (typeof ref === 'object') {
        const obj = ref as { name?: unknown; rut?: unknown }
        map.set(id, {
          id,
          name:
            typeof obj.name === 'string' && obj.name.trim()
              ? obj.name
              : 'Sin nombre',
          rut: typeof obj.rut === 'string' ? obj.rut : ''
        })
      } else {
        map.set(id, { id, name: 'Sin nombre', rut: '' })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  )
}

/**
 * Opciones destinatario: todos los `toUserId` distintos + un ítem por `toRut` cuando
 * el envío **no** tiene usuario receptor (solo RUT registrado).
 */
export function buildToRecipientOptions(
  mails: ReadonlyArray<MailParticipants>
): FilterToRecipient[] {
  const byUser = new Map<string, FilterToRecipient>()
  const byRut = new Map<string, FilterToRutOnly>()

  for (const m of mails) {
    const to = m.toUserId
    if (!to) continue
    const id = mailParticipantId(to)
    if (!id || byUser.has(id)) continue
    if (typeof to === 'object') {
      const obj = to as { name?: unknown; rut?: unknown }
      byUser.set(id, {
        kind: 'user',
        id,
        name:
          typeof obj.name === 'string' && obj.name.trim()
            ? obj.name
            : 'Sin nombre',
        rut: typeof obj.rut === 'string' ? obj.rut : ''
      })
    } else {
      byUser.set(id, {
        kind: 'user',
        id,
        name: 'Sin nombre',
        rut: ''
      })
    }
  }

  for (const m of mails) {
    if (m.toUserId) continue
    const raw = typeof m.toRut === 'string' ? m.toRut.trim() : ''
    if (!raw) continue
    const rutKey = rutCompareKey(raw)
    if (!rutKey || byRut.has(rutKey)) continue
    byRut.set(rutKey, {
      kind: 'toRut',
      id: `toRut:${rutKey}`,
      rutDisplay: raw,
      rutKey
    })
  }

  const usersSorted = [...byUser.values()].sort((a, b) =>
    a.kind === 'user' && b.kind === 'user'
      ? a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      : 0
  )
  const rutsSorted = [...byRut.values()].sort((a, b) =>
    a.rutDisplay.localeCompare(b.rutDisplay, 'es', { sensitivity: 'base' })
  )
  return [...usersSorted, ...rutsSorted]
}

/** Filtra la lista cargada por destinatario elegido en el autocomplete. */
export function mailMatchesToRecipientFilter(
  m: MailParticipants,
  sel: FilterToRecipient | null
): boolean {
  if (!sel) return true
  if (sel.kind === 'user') {
    const tid = mailParticipantId(m.toUserId)
    return Boolean(tid && tid === sel.id)
  }
  if (m.toUserId) return false
  const key = rutCompareKey(m.toRut)
  return Boolean(key && key === sel.rutKey)
}

/** Búsqueda en el texto del autocomplete (nombre o variantes RUT). */
export function participantSearchMatches(
  query: string,
  u: FilterFromUser
): boolean {
  const v = query.trim().toLowerCase()
  if (!v) return true
  if (u.name?.toLowerCase().includes(v)) return true
  if (!u.rut) return false
  try {
    return (
      u.rut.toLowerCase().includes(v) ||
      rutCompareKey(u.rut).includes(rutCompareKey(query)) ||
      rutCompareKey(u.rut).includes(v.replace(/\D/g, ''))
    )
  } catch {
    return u.rut.toLowerCase().includes(v)
  }
}

export function toRecipientSearchMatches(
  query: string,
  o: FilterToRecipient
): boolean {
  const v = query.trim().toLowerCase()
  if (!v) return true
  if (o.kind === 'user') return participantSearchMatches(query, o)
  if (o.rutDisplay.toLowerCase().includes(v)) return true
  const qDigits = v.replace(/\D/g, '')
  if (qDigits && o.rutKey.replace(/\D/g, '').includes(qDigits)) return true
  try {
    const qk = rutCompareKey(query.trim())
    return Boolean(qk && (o.rutKey === qk || o.rutKey.includes(qk)))
  } catch {
    return false
  }
}
