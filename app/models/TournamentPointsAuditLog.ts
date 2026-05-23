import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type TournamentPointsAuditAction = 'created' | 'updated' | 'deducted'

export interface ITournamentPointsAuditChange {
  popId: string
  displayName: string
  placeBefore?: number
  placeAfter?: number
  pointsBefore?: number
  pointsAfter?: number
  /** Motivo del descuento (gestión admin). */
  reason?: string
  kind: 'added' | 'removed' | 'modified'
}

export interface ITournamentPointsAuditLog extends Document {
  storeId: Types.ObjectId
  awardId: Types.ObjectId
  eventId?: Types.ObjectId
  eventTitle: string
  action: TournamentPointsAuditAction
  changedByUserId?: Types.ObjectId
  changedByName?: string
  summary: string
  changes: ITournamentPointsAuditChange[]
}

const ChangeSchema = new Schema<ITournamentPointsAuditChange>(
  {
    popId: { type: String, required: true, trim: true, maxlength: 32 },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    placeBefore: { type: Number, min: 0, max: 9999 },
    placeAfter: { type: Number, min: 0, max: 9999 },
    pointsBefore: { type: Number, min: 0, max: 999_999 },
    pointsAfter: { type: Number, min: 0, max: 999_999 },
    reason: { type: String, trim: true, maxlength: 500 },
    kind: {
      type: String,
      enum: ['added', 'removed', 'modified'],
      required: true
    }
  },
  { _id: false }
)

const TournamentPointsAuditLogSchema = new Schema<ITournamentPointsAuditLog>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    awardId: {
      type: Schema.Types.ObjectId,
      ref: 'TournamentPointsAward',
      required: true,
      index: true
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyEvent',
      required: false
    },
    eventTitle: { type: String, required: true, trim: true, maxlength: 300 },
    action: {
      type: String,
      enum: ['created', 'updated', 'deducted'],
      required: true
    },
    changedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByName: { type: String, trim: true, maxlength: 200 },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    changes: { type: [ChangeSchema], default: [] }
  },
  { timestamps: true }
)

TournamentPointsAuditLogSchema.index({ storeId: 1, createdAt: -1 })

export default mongoose.models.TournamentPointsAuditLog ||
  mongoose.model<ITournamentPointsAuditLog>(
    'TournamentPointsAuditLog',
    TournamentPointsAuditLogSchema
  )
