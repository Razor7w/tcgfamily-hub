import mongoose, { Schema, type Document, type Types } from 'mongoose'
import {
  CARD_PHOTO_DESCRIPTION_MAX,
  CARD_PHOTO_NAME_MAX
} from '@/lib/card-binder-constants'

export interface ICardPhoto extends Document {
  userId: Types.ObjectId
  binderId: Types.ObjectId
  name: string
  description: string
  imageUrl: string
  imageKey: string
  published: boolean
  interestCount: number
  createdAt: Date
  updatedAt: Date
}

const CardPhotoSchema = new Schema<ICardPhoto>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    binderId: {
      type: Schema.Types.ObjectId,
      ref: 'CardBinder',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: CARD_PHOTO_NAME_MAX
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: CARD_PHOTO_DESCRIPTION_MAX
    },
    imageUrl: { type: String, required: true, trim: true, maxlength: 600 },
    imageKey: { type: String, required: true, trim: true, maxlength: 300 },
    published: { type: Boolean, default: false, index: true },
    interestCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, strict: true }
)

CardPhotoSchema.index({ binderId: 1, updatedAt: -1 })
CardPhotoSchema.index({ userId: 1, updatedAt: -1 })
CardPhotoSchema.index({ binderId: 1, published: 1, updatedAt: -1 })

const MODEL = 'CardPhoto'

function getCardPhotoModel(): mongoose.Model<ICardPhoto> {
  const existing = mongoose.models[MODEL] as
    | mongoose.Model<ICardPhoto>
    | undefined
  if (existing?.schema?.path('interestCount')) {
    return existing
  }
  if (existing) {
    delete mongoose.models[MODEL]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    delete (mongoose.connection.models as any)[MODEL]
  }
  return mongoose.model<ICardPhoto>(MODEL, CardPhotoSchema)
}

export default getCardPhotoModel()
