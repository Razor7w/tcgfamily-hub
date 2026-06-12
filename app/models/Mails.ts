import mongoose, { Schema, Document, ObjectId } from 'mongoose'

export interface IMail extends Document {
  /** Alcance por tienda; legacy sin campo ⇒ tratado como tienda TCGFamily en runtime. */
  storeId?: ObjectId
  code: string
  fromUserId: ObjectId
  toUserId?: ObjectId
  /** RUT del receptor (válido), aunque no exista usuario. */
  toRut: string
  isRecived: boolean
  isRecivedInStore: boolean
  /** Momento en que la tienda marcó como recibido en tienda (ancla para días esperando retiro). */
  receivedInStoreAt?: Date | null
  observations?: string
}

const MailSchema = new Schema<IMail>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
      index: true
    },
    code: {
      type: String,
      required: true,
      unique: false
    },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: undefined
    },
    toRut: { type: String, required: true, index: true },
    isRecived: { type: Boolean, default: false, required: true },
    isRecivedInStore: { type: Boolean, default: false, required: true },
    receivedInStoreAt: { type: Date, default: undefined },
    observations: { type: String, default: '' }
  },
  {
    timestamps: true,
    strict: true
  }
)

/** Una misma etiqueta visible `code` puede repetirse en otras tiendas; unicidad sólo dentro de cada tienda. */
MailSchema.index(
  { storeId: 1, code: 1 },
  {
    unique: true,
    name: 'mails_storeId_code_unique',
    /** `$ne: null` no está permitido en partialFilterExpression (MongoDB 67). */
    partialFilterExpression: { storeId: { $type: 'objectId' } }
  }
)
/** Correos legacy sin tienda persistida en el documento */
MailSchema.index(
  { code: 1 },
  {
    unique: true,
    name: 'mails_legacy_missing_store_code_unique',
    /**
     * No usar `$exists: false` en partialFilterExpression (MongoDB 67 / CannotCreateIndex).
     * Igualdad a `null` incluye campo ausente o valor null en el filtro del índice.
     */
    partialFilterExpression: { storeId: null }
  }
)

/** Cuota diaria por emisor: equality on fromUserId + range on createdAt */
MailSchema.index({ fromUserId: 1, createdAt: 1 })

/** GET /api/mail (staff): listado por tienda + sort reciente */
MailSchema.index({ storeId: 1, createdAt: -1 })

/** GET /api/mail/me — bandeja por usuario (to / from / RUT) + pending + sort reciente */
MailSchema.index({ toUserId: 1, isRecived: 1, createdAt: -1 })
MailSchema.index({ fromUserId: 1, isRecived: 1, createdAt: -1 })
MailSchema.index({ toRut: 1, isRecived: 1, createdAt: -1 })

export default mongoose.models.Mail || mongoose.model<IMail>('Mail', MailSchema)
