import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IStore extends Document {
  name: string
  /** Identificador URL estable (único global). Ej. tcgfamily */
  slug: string
  logoUrl?: string
  /** Key en R2 para borrar/reemplazar logo (opcional). */
  logoKey?: string
  isActive: boolean
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      unique: true,
      index: true
    },
    logoUrl: { type: String, default: '' },
    logoKey: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, strict: true }
)

if (mongoose.models.Store) {
  delete mongoose.models.Store
}

export default mongoose.model<IStore>('Store', StoreSchema)

export type StoreLean = {
  _id: Types.ObjectId
  slug: string
  name: string
}
