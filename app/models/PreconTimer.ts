import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { PreconTimerStatus } from '@/lib/precon-timer'

export interface IPreconTimer extends Document {
  storeId: Types.ObjectId
  token: string
  durationMinutes: number
  status: PreconTimerStatus
  startedAt: Date | null
  endsAt: Date | null
  remainingMs: number
  roundNumber: number | null
  createdAt: Date
  updatedAt: Date
}

const PreconTimerSchema = new Schema<IPreconTimer>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true
    },
    token: {
      type: String,
      required: true,
      trim: true
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 50,
      min: 1,
      max: 240
    },
    status: {
      type: String,
      enum: ['idle', 'running', 'paused'],
      required: true,
      default: 'idle'
    },
    startedAt: {
      type: Date,
      default: null
    },
    endsAt: {
      type: Date,
      default: null
    },
    remainingMs: {
      type: Number,
      required: true,
      default: 50 * 60_000,
      min: 0
    },
    roundNumber: {
      type: Number,
      default: null
    }
  },
  { timestamps: true, strict: true, collection: 'precontimers' }
)

PreconTimerSchema.index({ token: 1 }, { unique: true })
PreconTimerSchema.index({ storeId: 1 }, { unique: true })

if (mongoose.models.PreconTimer) {
  delete mongoose.models.PreconTimer
}

export default mongoose.model<IPreconTimer>('PreconTimer', PreconTimerSchema)
