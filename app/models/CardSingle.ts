import mongoose, { Schema, type Document, type Types } from 'mongoose'
import {
  CARD_SINGLE_NOTE_MAX,
  CARD_SINGLE_PRICE_CLP_MAX,
  CARD_SINGLE_QUANTITY_MAX
} from '@/lib/card-binder-constants'
import {
  CARD_SINGLE_CONDITIONS,
  type CardSingleCondition
} from '@/lib/card-single-condition'
import {
  CARD_SINGLE_LANGUAGES,
  type CardSingleLanguage
} from '@/lib/card-single-language'

/** `set` choca con `Document#set` de Mongoose; el campo en BD se llama `setCode`. */
export interface ICardSingle extends Document {
  userId: Types.ObjectId
  binderId: Types.ObjectId
  storeId?: Types.ObjectId | null
  limitlessId: number
  setCode: string
  number: string
  region: string
  name: string
  cardType: string
  condition: CardSingleCondition
  language: CardSingleLanguage
  priceClp: number
  compareAtPriceClp?: number | null
  quantity: number
  published: boolean
  note: string
  marketPriceUsd?: number | null
  interestCount: number
  createdAt: Date
  updatedAt: Date
}

const CardSingleSchema = new Schema<ICardSingle>(
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
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
      required: false
    },
    limitlessId: { type: Number, required: true },
    setCode: { type: String, required: true, trim: true, maxlength: 32 },
    number: { type: String, required: true, trim: true, maxlength: 32 },
    region: { type: String, required: true, trim: true, maxlength: 16 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    cardType: { type: String, default: '', trim: true, maxlength: 64 },
    condition: {
      type: String,
      required: true,
      enum: CARD_SINGLE_CONDITIONS,
      default: 'NM'
    },
    language: {
      type: String,
      required: true,
      enum: CARD_SINGLE_LANGUAGES,
      default: 'EN',
      index: true
    },
    priceClp: {
      type: Number,
      required: true,
      min: 0,
      max: CARD_SINGLE_PRICE_CLP_MAX
    },
    /** Precio tachado (antes de la oferta). Solo si es > priceClp. */
    compareAtPriceClp: {
      type: Number,
      default: null,
      required: false,
      min: 0,
      max: CARD_SINGLE_PRICE_CLP_MAX
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: CARD_SINGLE_QUANTITY_MAX,
      default: 1
    },
    published: { type: Boolean, default: false, index: true },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: CARD_SINGLE_NOTE_MAX
    },
    marketPriceUsd: { type: Number, default: null, required: false },
    interestCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, strict: true }
)

CardSingleSchema.index({ binderId: 1, updatedAt: -1 })
CardSingleSchema.index({ userId: 1, updatedAt: -1 })
CardSingleSchema.index({ storeId: 1, published: 1, updatedAt: -1 })
CardSingleSchema.index({
  binderId: 1,
  published: 1,
  language: 1,
  updatedAt: -1
})

const MODEL = 'CardSingle'

/** Evita schema viejo en HMR de Next (sin language / compareAtPriceClp). */
function getCardSingleModel(): mongoose.Model<ICardSingle> {
  const existing = mongoose.models[MODEL] as
    | mongoose.Model<ICardSingle>
    | undefined
  if (
    existing?.schema?.path('language') &&
    existing?.schema?.path('compareAtPriceClp')
  ) {
    return existing
  }
  if (existing) {
    delete mongoose.models[MODEL]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (mongoose.connection.models as any)[MODEL]
  }
  return mongoose.model<ICardSingle>(MODEL, CardSingleSchema)
}

export default getCardSingleModel()
