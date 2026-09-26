import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ICardSingleInterest extends Document {
  singleId: Types.ObjectId
  userId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CardSingleInterestSchema = new Schema<ICardSingleInterest>(
  {
    singleId: {
      type: Schema.Types.ObjectId,
      ref: 'CardSingle',
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

CardSingleInterestSchema.index({ singleId: 1, userId: 1 }, { unique: true })
CardSingleInterestSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.CardSingleInterest ||
  mongoose.model<ICardSingleInterest>(
    'CardSingleInterest',
    CardSingleInterestSchema
  )
