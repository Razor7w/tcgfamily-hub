import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IUserSuggestion extends Document {
  userId: Types.ObjectId
  text: string
}

const UserSuggestionSchema = new Schema<IUserSuggestion>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    }
  },
  { timestamps: true, strict: true }
)

if (mongoose.models.UserSuggestion) {
  delete mongoose.models.UserSuggestion
}

export default mongoose.model<IUserSuggestion>(
  'UserSuggestion',
  UserSuggestionSchema
)
