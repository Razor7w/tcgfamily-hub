import 'server-only'

import type { Document, Types } from 'mongoose'
import { rutForStorage } from '@/lib/rut-chile'
import { getRutFieldError } from '@/lib/rut-input'
import { rutMatchVariants } from '@/lib/store-points-csv'
import { linkAwaitingTeamInvitationsForUser } from '@/lib/teams/invite-by-rut'
import User from '@/models/User'

type UserRutDoc = Document & {
  _id: Types.ObjectId
  rut?: string
}

export type ApplyUserRutOnceResult =
  | { ok: true; rut: string; assigned: boolean }
  | { ok: false; error: string; status: 400 | 409 }

/**
 * Aplica RUT en el documento de usuario solo si aún no tiene uno.
 * No hace `save()`; el caller debe persistir.
 * Si ya tiene RUT distinto, error; si es el mismo, `assigned: false`.
 */
export async function applyUserRutOnceToDoc(
  user: UserRutDoc,
  rutRaw: string,
  options?: { required?: boolean }
): Promise<ApplyUserRutOnceResult> {
  const required = options?.required === true
  const rutErr = getRutFieldError(rutRaw, required)
  if (rutErr) {
    return { ok: false, error: rutErr, status: 400 }
  }

  const trimmed = rutRaw.trim()
  if (!trimmed) {
    return { ok: true, rut: '', assigned: false }
  }

  const rutStored = rutForStorage(trimmed)
  if (!rutStored) {
    return { ok: false, error: 'RUT inválido.', status: 400 }
  }

  const current = typeof user.rut === 'string' ? user.rut.trim() : ''
  if (current) {
    const currentStored = rutForStorage(current) || current
    if (currentStored === rutStored || current === rutStored) {
      return { ok: true, rut: current, assigned: false }
    }
    return {
      ok: false,
      error: 'Tu RUT ya está asignado y no se puede modificar.',
      status: 400
    }
  }

  const variants = rutMatchVariants(rutStored)
  const existingRut = await User.findOne({
    rut: { $in: variants },
    _id: { $ne: user._id }
  }).select('_id')
  if (existingRut) {
    return {
      ok: false,
      error:
        'Este RUT ya está vinculado a otra cuenta. Debes usar tu propio RUT (no el del receptor ni uno de otra cuenta).',
      status: 409
    }
  }

  user.rut = rutStored
  return { ok: true, rut: rutStored, assigned: true }
}

export async function linkTeamInvitesAfterRutAssign(
  userId: string,
  rutStored: string
): Promise<void> {
  if (!rutStored.trim()) return
  try {
    await linkAwaitingTeamInvitationsForUser(userId, rutStored)
  } catch (e) {
    console.error('linkAwaitingTeamInvitationsForUser (rut assign):', e)
  }
}

export function userHasAssignedRut(rut: string | null | undefined): boolean {
  return Boolean(typeof rut === 'string' && rut.trim())
}
