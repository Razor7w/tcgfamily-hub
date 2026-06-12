import mongoose, { Schema, type Document, type Types } from 'mongoose'

/** Jugador oculto de la lista de gestión (p. ej. solo historial en auditoría). */
export interface ITournamentPointsListExclusion extends Document {
  storeId: Types.ObjectId
  /** `u:<userId>` o `p:<popId>`. */
  identityKey: string
  userId?: Types.ObjectId
  primaryPopId: string
  displayName: string
  reason: string
  excludedByUserId?: Types.ObjectId
}

const TournamentPointsListExclusionSchema =
  new Schema<ITournamentPointsListExclusion>(
    {
      storeId: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
      },
      identityKey: { type: String, required: true, trim: true, maxlength: 80 },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      primaryPopId: { type: String, required: true, trim: true, maxlength: 32 },
      displayName: { type: String, required: true, trim: true, maxlength: 200 },
      reason: { type: String, required: true, trim: true, maxlength: 500 },
      excludedByUserId: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
  )

TournamentPointsListExclusionSchema.index(
  { storeId: 1, identityKey: 1 },
  { unique: true }
)

export default mongoose.models.TournamentPointsListExclusion ||
  mongoose.model<ITournamentPointsListExclusion>(
    'TournamentPointsListExclusion',
    TournamentPointsListExclusionSchema
  )
