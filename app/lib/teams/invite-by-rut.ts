import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { rutCompareKey } from '@/lib/mail-recipient-filter'
import { rutForStorage } from '@/lib/rut-chile'
import { rutMatchVariants } from '@/lib/store-points-csv'
import TeamInvitation from '@/models/TeamInvitation'
import User from '@/models/User'

export function teamInviteRutKey(raw: string): string {
  const stored = rutForStorage(raw)
  return rutCompareKey(stored || raw)
}

export async function findUserByRut(raw: string) {
  const stored = rutForStorage(raw)
  if (!stored) return null
  await connectDB()
  const variants = rutMatchVariants(stored)
  return User.findOne({ rut: { $in: variants } })
    .select('_id email rut')
    .lean<{
      _id: mongoose.Types.ObjectId
      email?: string
      rut?: string
    } | null>()
}

/**
 * Convierte invitaciones por RUT sin cuenta en solicitudes notificables al usuario.
 */
export async function linkAwaitingTeamInvitationsForUser(
  userId: string,
  rutRaw: string
): Promise<number> {
  const key = teamInviteRutKey(rutRaw)
  if (!key || !mongoose.Types.ObjectId.isValid(userId)) return 0

  await connectDB()
  const result = await TeamInvitation.updateMany(
    {
      inviteeRutKey: key,
      status: 'awaiting_user',
      expiresAt: { $gt: new Date() }
    },
    {
      $set: {
        inviteeUserId: new mongoose.Types.ObjectId(userId),
        status: 'pending'
      }
    }
  )

  return result.modifiedCount
}
