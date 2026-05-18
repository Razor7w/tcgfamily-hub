import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IStore extends Document {
  name: string
  /** Identificador URL estable (único global). Ej. tcgfamily */
  slug: string
  logoUrl?: string
  /** Key en R2 para borrar/reemplazar logo (opcional). */
  logoKey?: string
  /** Dirección física (visible en el hub `/{slug}`). */
  address?: string
  /** Sitio web público de la tienda. */
  websiteUrl?: string
  /** Perfil de Instagram (URL o @usuario). */
  instagramUrl?: string
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
    address: { type: String, default: '', maxlength: 500 },
    websiteUrl: { type: String, default: '', maxlength: 2048 },
    instagramUrl: { type: String, default: '', maxlength: 2048 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, strict: true }
)

/** Listados `find({ isActive: true }).sort({ name: 1 })` (me/stores, admin, signup). */
StoreSchema.index({ isActive: 1, name: 1 })

if (mongoose.models.Store) {
  delete mongoose.models.Store
}

export default mongoose.model<IStore>('Store', StoreSchema)

export type StoreLean = {
  _id: Types.ObjectId
  slug: string
  name: string
}
