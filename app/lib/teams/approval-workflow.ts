import 'server-only'

import mongoose from 'mongoose'
import Team from '@/models/Team'
import TeamMembership from '@/models/TeamMembership'

const SUPERSEDED_REASON =
  'Reemplazado por la aprobación de otra solicitud del mismo capitán.'

export async function rejectOtherCaptainTeamApplications(input: {
  captainUserId: mongoose.Types.ObjectId
  exceptTeamId: mongoose.Types.ObjectId
  reviewedByUserId: mongoose.Types.ObjectId
  reason?: string
}): Promise<number> {
  const now = new Date()
  const reason = input.reason?.trim() || SUPERSEDED_REASON

  const others = await Team.find({
    captainUserId: input.captainUserId,
    _id: { $ne: input.exceptTeamId },
    $or: [
      { approvalStatus: 'pending' },
      { approvalStatus: 'approved', isActive: false }
    ]
  })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId }[]>()

  if (others.length === 0) return 0

  const otherIds = others.map(t => t._id)

  await Team.updateMany(
    { _id: { $in: otherIds } },
    {
      $set: {
        approvalStatus: 'rejected',
        isActive: false,
        reviewedAt: now,
        reviewedByUserId: input.reviewedByUserId,
        rejectionReason: reason
      }
    }
  )

  await TeamMembership.updateMany(
    {
      teamId: { $in: otherIds },
      userId: input.captainUserId,
      status: 'active'
    },
    { $set: { status: 'left' } }
  )

  return otherIds.length
}

export async function deactivateCaptainTeamMemberships(input: {
  teamId: mongoose.Types.ObjectId
  captainUserId: mongoose.Types.ObjectId
}): Promise<void> {
  await TeamMembership.updateMany(
    {
      teamId: input.teamId,
      userId: input.captainUserId,
      status: 'active'
    },
    { $set: { status: 'left' } }
  )
}
