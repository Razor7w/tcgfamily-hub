import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { TeamPostVisibility } from '@/lib/teams/post-constants'

export interface ITeamPost extends Document {
  teamId: Types.ObjectId
  authorUserId: Types.ObjectId
  title: string
  bodyHtml: string
  coverUrl: string
  coverKey: string
  decklistId?: Types.ObjectId
  visibility: TeamPostVisibility
  likeCount: number
  dislikeCount: number
  commentCount: number
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const TeamPostSchema = new Schema<ITeamPost>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true
    },
    authorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, default: '', trim: true, maxlength: 120 },
    bodyHtml: { type: String, required: true, maxlength: 24_000 },
    coverUrl: { type: String, default: '' },
    coverKey: { type: String, default: '' },
    decklistId: {
      type: Schema.Types.ObjectId,
      ref: 'SavedDecklist',
      default: undefined
    },
    visibility: {
      type: String,
      enum: ['public', 'members_only'],
      default: 'public',
      required: true,
      index: true
    },
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: undefined }
  },
  { timestamps: true, strict: true }
)

TeamPostSchema.index({ teamId: 1, deletedAt: 1, createdAt: -1 })
TeamPostSchema.index({ teamId: 1, visibility: 1, deletedAt: 1, createdAt: -1 })
TeamPostSchema.index({ authorUserId: 1, createdAt: -1 })
TeamPostSchema.index(
  { teamId: 1, deletedAt: 1, _id: -1 },
  { partialFilterExpression: { deletedAt: null } }
)
TeamPostSchema.index(
  { teamId: 1, visibility: 1, deletedAt: 1, _id: -1 },
  { partialFilterExpression: { deletedAt: null } }
)

if (mongoose.models.TeamPost) {
  delete mongoose.models.TeamPost
}

export default mongoose.model<ITeamPost>('TeamPost', TeamPostSchema)
