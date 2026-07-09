import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ITeamMedalAward extends Document {
  teamId: Types.ObjectId
  medalSlug: string
  /** Clave única por equipo (p. ej. `league_champion:<leagueId>`). */
  instanceKey: string
  seasonKey?: string
  label?: string
  description?: string
  metadata?: Record<string, string>
  earnedAt: Date
  grantedByUserId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TeamMedalAwardSchema = new Schema<ITeamMedalAward>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true
    },
    medalSlug: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64
    },
    instanceKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    seasonKey: { type: String, trim: true, maxlength: 32, default: undefined },
    label: { type: String, trim: true, maxlength: 120, default: undefined },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: undefined
    },
    metadata: {
      type: Map,
      of: String,
      default: undefined
    },
    earnedAt: { type: Date, required: true, index: true },
    grantedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined
    }
  },
  { timestamps: true, strict: true }
)

TeamMedalAwardSchema.index({ teamId: 1, earnedAt: -1 })
TeamMedalAwardSchema.index({ teamId: 1, instanceKey: 1 }, { unique: true })

if (mongoose.models.TeamMedalAward) {
  delete mongoose.models.TeamMedalAward
}

export default mongoose.model<ITeamMedalAward>(
  'TeamMedalAward',
  TeamMedalAwardSchema
)
