import mongoose, { Schema, Document, Types } from 'mongoose'

export type StoreMembershipRole = 'owner' | 'store_admin'

export interface IStoreMembership extends Document {
  userId: Types.ObjectId
  storeId: Types.ObjectId
  role: StoreMembershipRole
}

const StoreMembershipSchema = new Schema<IStoreMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['owner', 'store_admin'],
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    strict: true
  }
)

StoreMembershipSchema.index({ userId: 1, storeId: 1 }, { unique: true })

if (mongoose.models.StoreMembership) {
  delete mongoose.models.StoreMembership
}

export default mongoose.model<IStoreMembership>(
  'StoreMembership',
  StoreMembershipSchema
)
