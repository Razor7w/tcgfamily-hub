import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  getPendingTeamApplicationForUser,
  userAlreadyInAnyTeam
} from '@/lib/teams/access'
import TeamInvitation from '@/models/TeamInvitation'
import TeamJoinRequest from '@/models/TeamJoinRequest'
import TeamMembership from '@/models/TeamMembership'

export type ActivateTeamMembershipResult =
  | { ok: true }
  | {
      ok: false
      error: string
      code?: string
      status: 400 | 409
    }

export async function activateUserTeamMembership(
  userId: string,
  teamId: mongoose.Types.ObjectId,
  options?: { keepJoinRequestId?: string }
): Promise<ActivateTeamMembershipResult> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { ok: false, error: 'Usuario inválido', status: 400 }
  }

  await connectDB()
  const uid = new mongoose.Types.ObjectId(userId)

  if (await userAlreadyInAnyTeam(userId)) {
    return {
      ok: false,
      error: 'Ya perteneces a un equipo',
      code: 'already_in_team',
      status: 409
    }
  }

  const pendingApplication = await getPendingTeamApplicationForUser(userId)
  if (pendingApplication) {
    return {
      ok: false,
      error: 'Tienes una solicitud de equipo pendiente de aprobación',
      code: 'team_application_pending',
      status: 409
    }
  }

  const existingLeft = await TeamMembership.findOne({
    teamId,
    userId: uid
  }).lean()

  if (existingLeft) {
    await TeamMembership.updateOne(
      { _id: existingLeft._id },
      { $set: { status: 'active', role: 'member' } }
    )
  } else {
    await TeamMembership.create({
      teamId,
      userId: uid,
      role: 'member',
      status: 'active'
    })
  }

  await TeamInvitation.updateMany(
    { inviteeUserId: uid, status: 'pending' },
    { $set: { status: 'cancelled' } }
  )

  const joinRequestFilter: Record<string, unknown> = {
    requesterUserId: uid,
    status: 'pending'
  }
  if (
    options?.keepJoinRequestId &&
    mongoose.Types.ObjectId.isValid(options.keepJoinRequestId)
  ) {
    joinRequestFilter._id = {
      $ne: new mongoose.Types.ObjectId(options.keepJoinRequestId)
    }
  }

  await TeamJoinRequest.updateMany(joinRequestFilter, {
    $set: { status: 'cancelled' }
  })

  return { ok: true }
}
