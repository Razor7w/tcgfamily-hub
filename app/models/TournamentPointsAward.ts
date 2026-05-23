import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ITournamentPointsAwardRow {
  place: number
  displayName: string
  popId: string
  userId?: Types.ObjectId
  points: number
}

export interface ITournamentPointsAward extends Document {
  storeId: Types.ObjectId
  /** Torneo real en la app; ausente en importaciones CSV históricas. */
  eventId?: Types.ObjectId
  /** Clave estable por grupo CSV sin `evento_id` (única por tienda). */
  importGroupKey?: string
  eventTitle: string
  /** Fecha mostrada en historial cuando no hay `eventId`. */
  awardedAt?: Date
  playerCount: number
  topCount: number
  rows: ITournamentPointsAwardRow[]
  createdByUserId?: Types.ObjectId
}

const RowSchema = new Schema<ITournamentPointsAwardRow>(
  {
    place: { type: Number, required: true, min: 1, max: 9999 },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    popId: { type: String, required: true, trim: true, maxlength: 32 },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    points: { type: Number, required: true, min: 0, max: 999_999 }
  },
  { _id: false }
)

const TournamentPointsAwardSchema = new Schema<ITournamentPointsAward>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyEvent',
      required: false
    },
    importGroupKey: {
      type: String,
      required: false,
      trim: true,
      maxlength: 320
    },
    eventTitle: { type: String, required: true, trim: true, maxlength: 300 },
    awardedAt: { type: Date, required: false },
    playerCount: { type: Number, required: true, min: 0, max: 9999 },
    topCount: { type: Number, required: true, min: 0, max: 9999 },
    rows: { type: [RowSchema], default: [] },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
)

TournamentPointsAwardSchema.index(
  { storeId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: { eventId: { $type: 'objectId' } }
  }
)
TournamentPointsAwardSchema.index(
  { storeId: 1, importGroupKey: 1 },
  {
    unique: true,
    partialFilterExpression: { importGroupKey: { $type: 'string' } }
  }
)

export default mongoose.models.TournamentPointsAward ||
  mongoose.model<ITournamentPointsAward>(
    'TournamentPointsAward',
    TournamentPointsAwardSchema
  )
