/** Cierra la preinscripción 1 segundo antes de la hora de inicio. */
export const REGISTRATION_CUTOFF_MS_BEFORE_START = 1000

export function registrationClosesAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() - REGISTRATION_CUTOFF_MS_BEFORE_START)
}

export function canPreRegisterNow(startsAt: Date, now = new Date()): boolean {
  return (
    now.getTime() <= startsAt.getTime() - REGISTRATION_CUTOFF_MS_BEFORE_START
  )
}

/** Puede desinscribirse mientras el evento no haya comenzado. */
export function canUnregisterNow(startsAt: Date, now = new Date()): boolean {
  return now.getTime() < startsAt.getTime()
}

export const DISPLAY_NAME_MAX = 80

export function normalizeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, DISPLAY_NAME_MAX)
}

type ParticipantForPairing = {
  _id: unknown
  displayName: string
  userId?: unknown
  table?: string
  opponentId?: string
}

/**
 * Mesa y nombre del oponente para el usuario de la sesión (emparejamientos por `_id`).
 */
export function pairingExtrasForUser(
  participants: ParticipantForPairing[],
  currentUserId: string | undefined
): { myTable: string | null; myOpponentName: string | null } {
  if (!currentUserId) {
    return { myTable: null, myOpponentName: null }
  }
  const mine = participants.find(
    p => p.userId && String(p.userId) === currentUserId
  )
  if (!mine) {
    return { myTable: null, myOpponentName: null }
  }
  const table = typeof mine.table === 'string' ? mine.table : ''
  const oid = typeof mine.opponentId === 'string' ? mine.opponentId.trim() : ''
  let opponentName: string | null = null
  if (oid) {
    const opp = participants.find(p => String(p._id) === oid)
    opponentName = typeof opp?.displayName === 'string' ? opp.displayName : null
  }
  return { myTable: table, myOpponentName: opponentName }
}
