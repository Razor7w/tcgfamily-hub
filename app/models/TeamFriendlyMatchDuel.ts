import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type {
  TeamFriendlyDuelReport,
  TeamFriendlyDuelStatus
} from '@/lib/teams/friendly-match/constants'
import { normalizeFriendlyDuelReport } from '@/lib/teams/friendly-match/constants'

export interface ITeamFriendlyMatchDuel extends Document {
  matchId: Types.ObjectId
  duelIndex: number
  roundNumber: number
  challengerUserId: Types.ObjectId
  opponentUserId: Types.ObjectId
  challengerSlot: number
  opponentSlot: number
  status: TeamFriendlyDuelStatus
  challengerReport?: TeamFriendlyDuelReport
  opponentReport?: TeamFriendlyDuelReport
  winnerUserId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TeamFriendlyMatchDuelSchema = new Schema<ITeamFriendlyMatchDuel>(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'TeamFriendlyMatch',
      required: true,
      index: true
    },
    duelIndex: { type: Number, required: true, min: 0, max: 8 },
    roundNumber: { type: Number, required: true, min: 1, max: 9 },
    challengerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    opponentUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    challengerSlot: { type: Number, required: true, min: 0, max: 2 },
    opponentSlot: { type: Number, required: true, min: 0, max: 2 },
    status: {
      type: String,
      enum: ['pending_reports', 'confirmed', 'disputed'],
      default: 'pending_reports',
      required: true,
      index: true
    },
    challengerReport: {
      type: String,
      enum: ['win', 'loss', 'tie'],
      default: undefined
    },
    opponentReport: {
      type: String,
      enum: ['win', 'loss', 'tie'],
      default: undefined
    },
    winnerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined
    }
  },
  { timestamps: true, strict: true }
)

TeamFriendlyMatchDuelSchema.index(
  { matchId: 1, duelIndex: 1 },
  { unique: true }
)
TeamFriendlyMatchDuelSchema.index({ matchId: 1, roundNumber: 1 })

TeamFriendlyMatchDuelSchema.pre('validate', function normalizeEmptyReports() {
  const challenger = normalizeFriendlyDuelReport(this.challengerReport)
  const opponent = normalizeFriendlyDuelReport(this.opponentReport)
  this.challengerReport = challenger ?? undefined
  this.opponentReport = opponent ?? undefined
})

if (mongoose.models.TeamFriendlyMatchDuel) {
  delete mongoose.models.TeamFriendlyMatchDuel
}

export default mongoose.model<ITeamFriendlyMatchDuel>(
  'TeamFriendlyMatchDuel',
  TeamFriendlyMatchDuelSchema
)
