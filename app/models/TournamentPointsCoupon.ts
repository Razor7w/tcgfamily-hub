import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ITournamentPointsCoupon extends Document {
  storeId: Types.ObjectId
  userId: Types.ObjectId
  code: string
  points: number
  reason: string
  /** Generación del cupón (canje válido hasta createdAt + 24h). */
  createdAt: Date
  expiresAt: Date
}

const TournamentPointsCouponSchema = new Schema<ITournamentPointsCoupon>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
      unique: true
    },
    points: { type: Number, required: true, min: 0.5, max: 99_999 },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
)

TournamentPointsCouponSchema.index({ storeId: 1, userId: 1, createdAt: -1 })
/** Listado admin de canjes por tienda. */
TournamentPointsCouponSchema.index({ storeId: 1, createdAt: -1 })

export default mongoose.models.TournamentPointsCoupon ||
  mongoose.model<ITournamentPointsCoupon>(
    'TournamentPointsCoupon',
    TournamentPointsCouponSchema
  )
