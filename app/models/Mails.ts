import mongoose, { Schema, Document, ObjectId } from 'mongoose'

export interface IMail extends Document {
  code: string
  fromUserId: ObjectId
  toUserId?: ObjectId
  /** RUT del receptor (válido), aunque no exista usuario. */
  toRut: string
  isRecived: boolean
  isRecivedInStore: boolean
  observations?: string
}

const MailSchema = new Schema<IMail>(
  {
    code: { type: String, required: true, unique: true, index: true },
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
    observations: { type: String, default: '' }
  },
  {
    timestamps: true,
    strict: true
  }
)

export default mongoose.models.Mail || mongoose.model<IMail>('Mail', MailSchema)
