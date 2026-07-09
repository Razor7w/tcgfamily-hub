import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type TeamPostReactionValue = 1 | -1

export interface ITeamPostReaction extends Document {
  postId: Types.ObjectId
  userId: Types.ObjectId
  value: TeamPostReactionValue
  createdAt: Date
  updatedAt: Date
}

const TeamPostReactionSchema = new Schema<ITeamPostReaction>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'TeamPost',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    value: { type: Number, enum: [1, -1], required: true }
  },
  { timestamps: true, strict: true }
)

TeamPostReactionSchema.index({ postId: 1, userId: 1 }, { unique: true })

if (mongoose.models.TeamPostReaction) {
  delete mongoose.models.TeamPostReaction
}

export default mongoose.model<ITeamPostReaction>(
  'TeamPostReaction',
  TeamPostReactionSchema
)
