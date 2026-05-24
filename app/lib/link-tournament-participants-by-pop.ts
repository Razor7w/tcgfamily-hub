import mongoose from 'mongoose'
import User from '@/models/User'
import WeeklyEvent from '@/models/WeeklyEvent'
import { popidForStorage, validatePopidOptional } from '@/lib/rut-chile'

const DEFAULT_MAX_EVENTS = 200

export type LinkParticipantsByPopResult = {
  linkedCount: number
  eventIds: string[]
  skippedAlreadyRegisteredInEvent: number
}

function participantPopNorm(popId: unknown): string {
  return popidForStorage(typeof popId === 'string' ? popId : '')
}

function participantHasUserId(participant: { userId?: unknown }): boolean {
  if (participant.userId == null) return false
  const s = String(participant.userId).trim()
  return s.length > 0
}

/**
 * Enlaza filas de torneo sin `userId` cuyo `participants.popId` coincide con el POP del usuario.
 * Solo torneos (`kind: tournament`). No sobrescribe filas que ya tienen otro `userId`.
 */
export async function linkTournamentParticipantsToUserByPop(
  userId: mongoose.Types.ObjectId,
  popIdRaw: string,
  options?: { maxEvents?: number }
): Promise<LinkParticipantsByPopResult> {
  const popNorm = popidForStorage(popIdRaw)
  if (!popNorm || validatePopidOptional(popNorm)) {
    return { linkedCount: 0, eventIds: [], skippedAlreadyRegisteredInEvent: 0 }
  }

  const maxEvents = Math.min(
    500,
    Math.max(1, options?.maxEvents ?? DEFAULT_MAX_EVENTS)
  )
  const uidStr = String(userId)

  const events = await WeeklyEvent.find({
    kind: 'tournament',
    participants: {
      $elemMatch: {
        popId: popNorm,
        $or: [{ userId: { $exists: false } }, { userId: null }]
      }
    }
  })
    .select('_id participants')
    .limit(maxEvents)
    .lean()

  let linkedCount = 0
  let skippedAlreadyRegisteredInEvent = 0
  const eventIds: string[] = []

  for (const ev of events) {
    const parts = (ev.participants ?? []) as {
      popId?: string
      userId?: unknown
    }[]

    const alreadyRegistered = parts.some(
      p => participantHasUserId(p) && String(p.userId) === uidStr
    )
    if (alreadyRegistered) {
      skippedAlreadyRegisteredInEvent++
      continue
    }

    const idx = parts.findIndex(
      p => participantPopNorm(p.popId) === popNorm && !participantHasUserId(p)
    )
    if (idx < 0) continue

    const updated = await WeeklyEvent.updateOne(
      { _id: ev._id },
      { $set: { [`participants.${idx}.userId`]: userId } }
    )
    if (updated.modifiedCount > 0 || updated.matchedCount > 0) {
      linkedCount++
      eventIds.push(String(ev._id))
    }
  }

  return { linkedCount, eventIds, skippedAlreadyRegisteredInEvent }
}

export type LinkEventParticipantByPopResult =
  | {
      ok: true
      userId: string
      userName: string
      userEmail: string
      alreadyLinked: boolean
    }
  | { ok: false; error: string; status: number }

/**
 * Vincula un participante del evento (por POP) con la cuenta `User` que tenga ese POP.
 */
export async function linkEventParticipantByPop(
  eventId: mongoose.Types.ObjectId,
  popIdRaw: string
): Promise<LinkEventParticipantByPopResult> {
  const popNorm = popidForStorage(popIdRaw)
  if (!popNorm) {
    return { ok: false, error: 'POP ID inválido', status: 400 }
  }
  const popErr = validatePopidOptional(popNorm)
  if (popErr) {
    return { ok: false, error: popErr, status: 400 }
  }

  const userDoc = await User.findOne({ popid: popNorm })
    .select('_id name email')
    .lean<{
      _id: mongoose.Types.ObjectId
      name?: string
      email?: string
    } | null>()
  if (!userDoc?._id) {
    return {
      ok: false,
      error: 'No hay ninguna cuenta de usuario con ese POP ID',
      status: 404
    }
  }

  const userOid = userDoc._id as mongoose.Types.ObjectId
  const uidStr = String(userOid)

  const raw = await WeeklyEvent.collection.findOne(
    { _id: eventId },
    { projection: { participants: 1, kind: 1 } }
  )
  if (!raw) {
    return { ok: false, error: 'Evento no encontrado', status: 404 }
  }
  if (raw.kind !== 'tournament') {
    return {
      ok: false,
      error: 'Solo aplica a torneos',
      status: 400
    }
  }

  const participants = (raw.participants ?? []) as {
    popId?: string
    userId?: unknown
  }[]

  const idx = participants.findIndex(
    p => participantPopNorm(p.popId) === popNorm
  )
  if (idx < 0) {
    return {
      ok: false,
      error: 'No hay participante con ese POP en este evento',
      status: 404
    }
  }

  const target = participants[idx]!
  if (participantHasUserId(target) && String(target.userId) === uidStr) {
    return {
      ok: true,
      userId: uidStr,
      userName: typeof userDoc.name === 'string' ? userDoc.name : '',
      userEmail: typeof userDoc.email === 'string' ? userDoc.email : '',
      alreadyLinked: true
    }
  }

  if (participantHasUserId(target)) {
    return {
      ok: false,
      error: 'Este participante ya tiene otra cuenta vinculada',
      status: 400
    }
  }

  const dupIdx = participants.findIndex(
    (p, i) =>
      i !== idx && participantHasUserId(p) && String(p.userId) === uidStr
  )
  if (dupIdx >= 0) {
    return {
      ok: false,
      error:
        'Ese usuario ya está inscrito en este torneo con otro POP o fila duplicada',
      status: 400
    }
  }

  await WeeklyEvent.collection.updateOne(
    { _id: eventId },
    { $set: { [`participants.${idx}.userId`]: userOid } }
  )

  return {
    ok: true,
    userId: uidStr,
    userName: typeof userDoc.name === 'string' ? userDoc.name : '',
    userEmail: typeof userDoc.email === 'string' ? userDoc.email : '',
    alreadyLinked: false
  }
}
