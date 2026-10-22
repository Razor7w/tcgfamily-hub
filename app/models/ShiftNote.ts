import mongoose, { Schema, Document, Types } from 'mongoose'
import { SHIFT_NOTE_BODY_MAX, type ShiftNoteStatus } from '@/lib/shift-note'

export interface IShiftNote extends Document {
  storeId: Types.ObjectId
  body: string
  imageUrl?: string | null
  status: ShiftNoteStatus
  createdBy: Types.ObjectId
  resolvedAt?: Date | null
  resolvedBy?: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const ShiftNoteSchema = new Schema<IShiftNote>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: SHIFT_NOTE_BODY_MAX
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 600
    },
    status: {
      type: String,
      enum: ['open', 'done'],
      required: true,
      default: 'open'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true, strict: true, collection: 'shiftnotes' }
)

ShiftNoteSchema.index({ storeId: 1, status: 1, createdAt: -1 })

if (mongoose.models.ShiftNote) {
  delete mongoose.models.ShiftNote
}

export default mongoose.model<IShiftNote>('ShiftNote', ShiftNoteSchema)
