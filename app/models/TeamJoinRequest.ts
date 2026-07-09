import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { TeamJoinRequestStatus } from '@/lib/teams/constants'

export interface ITeamJoinRequest extends Document {
  teamId: Types.ObjectId
  requesterUserId: Types.ObjectId
  status: TeamJoinRequestStatus
  respondedByUserId?: Types.ObjectId
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const TeamJoinRequestSchema = new Schema<ITeamJoinRequest>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true
    },
    requesterUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
      default: 'pending',
      required: true,
      index: true
    },
    respondedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  { timestamps: true, strict: true }
)

TeamJoinRequestSchema.index(
  { teamId: 1, requesterUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
    name: 'teamId_1_requesterUserId_1_pending_unique'
  }
)
TeamJoinRequestSchema.index(
  { requesterUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
    name: 'requesterUserId_1_pending_unique'
  }
)
TeamJoinRequestSchema.index(
  { teamId: 1, status: 1, createdAt: -1 },
  { name: 'teamId_1_status_1_createdAt_-1' }
)
TeamJoinRequestSchema.index(
  { requesterUserId: 1, status: 1, createdAt: -1 },
  { name: 'requesterUserId_1_status_1_createdAt_-1' }
)

if (mongoose.models.TeamJoinRequest) {
  delete mongoose.models.TeamJoinRequest
}

export default mongoose.model<ITeamJoinRequest>(
  'TeamJoinRequest',
  TeamJoinRequestSchema
)
