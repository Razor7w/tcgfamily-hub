import mongoose, { Schema, type Document, type Types } from 'mongoose'
import {
  CARD_BINDER_DESCRIPTION_MAX,
  CARD_BINDER_NAME_MAX,
  CARD_BINDER_SLUG_MAX
} from '@/lib/card-binder-constants'

export interface ICardBinder extends Document {
  userId: Types.ObjectId
  name: string
  /** Slug público único global → `/carpetas/[slug]`. */
  slug: string
  description: string
  createdAt: Date
  updatedAt: Date
}

const CardBinderSchema = new Schema<ICardBinder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: CARD_BINDER_NAME_MAX
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: CARD_BINDER_SLUG_MAX
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: CARD_BINDER_DESCRIPTION_MAX
    }
  },
  { timestamps: true, strict: true }
)

CardBinderSchema.index({ userId: 1, updatedAt: -1 })
CardBinderSchema.index({ slug: 1 }, { unique: true })

const MODEL = 'CardBinder'

/** Evita schema viejo en HMR de Next (sin campo `slug`). */
function getCardBinderModel(): mongoose.Model<ICardBinder> {
  const existing = mongoose.models[MODEL] as
    | mongoose.Model<ICardBinder>
    | undefined
  if (existing?.schema?.path('slug')) {
    return existing
  }
  if (existing) {
    delete mongoose.models[MODEL]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (mongoose.connection.models as any)[MODEL]
  }
  return mongoose.model<ICardBinder>(MODEL, CardBinderSchema)
}

export default getCardBinderModel()
