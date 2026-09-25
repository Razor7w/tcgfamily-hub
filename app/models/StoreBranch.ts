import mongoose, { Schema, Document, Types } from 'mongoose'

/**
 * Sucursal / punto de retiro bajo una tienda (tenant).
 * No es un Store aparte: misma membresía, hub y cuota; el correo se separa por `branchId`.
 */
export interface IStoreBranch extends Document {
  storeId: Types.ObjectId
  name: string
  /** Dirección o indicación del local (opcional). */
  address?: string
  isActive: boolean
  /** Orden en selectores (menor = primero). */
  sortOrder: number
}

const StoreBranchSchema = new Schema<IStoreBranch>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, default: '', maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true, strict: true }
)

/** Listado activo por tienda (registro de correo + admin). */
StoreBranchSchema.index({ storeId: 1, isActive: 1, sortOrder: 1, name: 1 })
/** Lookup por nombre dentro de la tienda (unicidad se valida en API). */
StoreBranchSchema.index({ storeId: 1, name: 1 })

if (mongoose.models.StoreBranch) {
  delete mongoose.models.StoreBranch
}

export default mongoose.model<IStoreBranch>('StoreBranch', StoreBranchSchema)

export type StoreBranchLean = {
  _id: Types.ObjectId
  storeId: Types.ObjectId
  name: string
  address?: string
  isActive: boolean
  sortOrder: number
}
