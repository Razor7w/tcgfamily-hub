import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { TeamInvitationStatus } from '@/lib/teams/constants'

export interface ITeamInvitation extends Document {
  teamId: Types.ObjectId
  invitedByUserId: Types.ObjectId
  inviteeUserId?: Types.ObjectId
  inviteeEmail?: string
  /** RUT canónico (`12345678-9`). */
  inviteeRut: string
  /** Clave estable para deduplicar y enlazar al registrarse. */
  inviteeRutKey: string
  token: string
  status: TeamInvitationStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const TeamInvitationSchema = new Schema<ITeamInvitation>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true
    },
    invitedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    inviteeUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    inviteeEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: ''
    },
    inviteeRut: {
      type: String,
      required: true,
      trim: true,
      default: '',
      maxlength: 16
    },
    inviteeRutKey: {
      type: String,
      required: true,
      trim: true,
      default: '',
      index: true
    },
    token: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: [
        'pending',
        'awaiting_user',
        'accepted',
        'declined',
        'cancelled',
        'expired'
      ],
      default: 'pending',
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  { timestamps: true, strict: true }
)

TeamInvitationSchema.index({ token: 1 }, { unique: true })
TeamInvitationSchema.index(
  { teamId: 1, inviteeUserId: 1, status: 1 },
  {
    partialFilterExpression: {
      status: 'pending',
      inviteeUserId: { $type: 'objectId' }
    }
  }
)
TeamInvitationSchema.index(
  { teamId: 1, inviteeRutKey: 1, status: 1 },
  {
    partialFilterExpression: {
      status: { $in: ['pending', 'awaiting_user'] }
    }
  }
)
TeamInvitationSchema.index({ inviteeUserId: 1, status: 1, expiresAt: -1 })
TeamInvitationSchema.index({ inviteeRutKey: 1, status: 1, expiresAt: -1 })

if (mongoose.models.TeamInvitation) {
  delete mongoose.models.TeamInvitation
}

export default mongoose.model<ITeamInvitation>(
  'TeamInvitation',
  TeamInvitationSchema
)
