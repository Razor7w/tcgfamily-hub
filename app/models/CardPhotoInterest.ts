import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ICardPhotoInterest extends Document {
  photoId: Types.ObjectId
  userId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CardPhotoInterestSchema = new Schema<ICardPhotoInterest>(
  {
    photoId: {
      type: Schema.Types.ObjectId,
      ref: 'CardPhoto',
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true, strict: true }
)

CardPhotoInterestSchema.index({ photoId: 1, userId: 1 }, { unique: true })
CardPhotoInterestSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.CardPhotoInterest ||
  mongoose.model<ICardPhotoInterest>(
    'CardPhotoInterest',
    CardPhotoInterestSchema
  )
