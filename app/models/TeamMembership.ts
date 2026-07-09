import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { TeamMembershipStatus, TeamRole } from '@/lib/teams/constants'

export interface ITeamMembership extends Document {
  teamId: Types.ObjectId
  userId: Types.ObjectId
  role: TeamRole
  status: TeamMembershipStatus
  /** Mazo público destacado en la página del equipo (uno por miembro). */
  featuredDecklistId?: Types.ObjectId
}

const TeamMembershipSchema = new Schema<ITeamMembership>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['captain', 'co_captain', 'member'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'left'],
      default: 'active',
      required: true
    },
    featuredDecklistId: {
      type: Schema.Types.ObjectId,
      ref: 'SavedDecklist',
      required: false,
      default: undefined
    }
  },
  { timestamps: true, strict: true }
)

TeamMembershipSchema.index({ teamId: 1, userId: 1 }, { unique: true })
/** Un usuario solo puede estar en un equipo activo a la vez (global). */
TeamMembershipSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
)
TeamMembershipSchema.index({ teamId: 1, status: 1 })
TeamMembershipSchema.index({ teamId: 1, status: 1, role: 1 })

if (mongoose.models.TeamMembership) {
  delete mongoose.models.TeamMembership
}

export default mongoose.model<ITeamMembership>(
  'TeamMembership',
  TeamMembershipSchema
)
