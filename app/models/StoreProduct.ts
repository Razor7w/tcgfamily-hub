import mongoose, { Schema, Document, Types } from 'mongoose'
import {
  STORE_PRODUCT_BARCODE_MAX,
  STORE_PRODUCT_NAME_MAX
} from '@/lib/store-product'

export interface IStoreProduct extends Document {
  storeId: Types.ObjectId
  barcode: string
  name: string
  priceClp: number
  createdBy?: Types.ObjectId | null
  updatedBy?: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const StoreProductSchema = new Schema<IStoreProduct>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    barcode: {
      type: String,
      required: true,
      trim: true,
      maxlength: STORE_PRODUCT_BARCODE_MAX
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: STORE_PRODUCT_NAME_MAX
    },
    priceClp: {
      type: Number,
      required: true,
      min: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true, strict: true, collection: 'storeproducts' }
)

StoreProductSchema.index({ storeId: 1, barcode: 1 }, { unique: true })
StoreProductSchema.index({ storeId: 1, updatedAt: -1 })

if (mongoose.models.StoreProduct) {
  delete mongoose.models.StoreProduct
}

export default mongoose.model<IStoreProduct>('StoreProduct', StoreProductSchema)
