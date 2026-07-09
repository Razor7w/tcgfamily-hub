import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ITeamPostComment extends Document {
  postId: Types.ObjectId
  authorUserId: Types.ObjectId
  body: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const TeamPostCommentSchema = new Schema<ITeamPostComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'TeamPost',
      required: true,
      index: true
    },
    authorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    deletedAt: { type: Date, default: undefined }
  },
  { timestamps: true, strict: true }
)

TeamPostCommentSchema.index({ postId: 1, deletedAt: 1, createdAt: 1 })

if (mongoose.models.TeamPostComment) {
  delete mongoose.models.TeamPostComment
}

export default mongoose.model<ITeamPostComment>(
  'TeamPostComment',
  TeamPostCommentSchema
)
