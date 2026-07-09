import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { TeamFriendlyMatchStatus } from '@/lib/teams/friendly-match/constants'
import { TEAM_FRIENDLY_POINTS_PER_WIN } from '@/lib/teams/friendly-match/constants'

export interface ITeamFriendlyLineupSlot {
  userId?: Types.ObjectId
  slot: number
  vacantSince?: Date
}

export interface ITeamFriendlyMatch extends Document {
  challengerTeamId: Types.ObjectId
  opponentTeamId: Types.ObjectId
  requestedByUserId: Types.ObjectId
  respondedByUserId?: Types.ObjectId
  status: TeamFriendlyMatchStatus
  tier: 'social'
  isIntramural: boolean
  pointsPerWin: number
  challengerLineup: ITeamFriendlyLineupSlot[]
  opponentLineup: ITeamFriendlyLineupSlot[]
  challengerPoints: number
  opponentPoints: number
  winnerTeamId?: Types.ObjectId
  expiresAt?: Date
  acceptedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LineupSlotSchema = new Schema<ITeamFriendlyLineupSlot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: undefined
    },
    slot: { type: Number, required: true, min: 0, max: 2 },
    vacantSince: { type: Date, default: undefined }
  },
  { _id: false }
)

const TeamFriendlyMatchSchema = new Schema<ITeamFriendlyMatch>(
  {
    challengerTeamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true
    },
    opponentTeamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true
    },
    requestedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    respondedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined
    },
    status: {
      type: String,
      enum: [
        'pending',
        'declined',
        'cancelled',
        'in_progress',
        'completed',
        'disputed'
      ],
      default: 'pending',
      required: true,
      index: true
    },
    tier: {
      type: String,
      enum: ['social'],
      default: 'social',
      required: true
    },
    isIntramural: {
      type: Boolean,
      default: false,
      required: true,
      index: true
    },
    pointsPerWin: {
      type: Number,
      default: TEAM_FRIENDLY_POINTS_PER_WIN,
      min: 1,
      max: 99
    },
    challengerLineup: {
      type: [LineupSlotSchema],
      default: []
    },
    opponentLineup: {
      type: [LineupSlotSchema],
      default: []
    },
    challengerPoints: { type: Number, default: 0, min: 0 },
    opponentPoints: { type: Number, default: 0, min: 0 },
    winnerTeamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: undefined
    },
    expiresAt: { type: Date, default: undefined, index: true },
    acceptedAt: { type: Date, default: undefined },
    completedAt: { type: Date, default: undefined }
  },
  { timestamps: true, strict: true }
)

TeamFriendlyMatchSchema.index({ challengerTeamId: 1, status: 1, createdAt: -1 })
TeamFriendlyMatchSchema.index({ opponentTeamId: 1, status: 1, createdAt: -1 })
TeamFriendlyMatchSchema.index({ challengerTeamId: 1, createdAt: -1 })
TeamFriendlyMatchSchema.index({ opponentTeamId: 1, createdAt: -1 })
TeamFriendlyMatchSchema.index(
  { challengerTeamId: 1, opponentTeamId: 1, status: 1 },
  {
    partialFilterExpression: {
      status: { $in: ['pending', 'in_progress'] }
    }
  }
)

if (mongoose.models.TeamFriendlyMatch) {
  delete mongoose.models.TeamFriendlyMatch
}

export default mongoose.model<ITeamFriendlyMatch>(
  'TeamFriendlyMatch',
  TeamFriendlyMatchSchema
)
