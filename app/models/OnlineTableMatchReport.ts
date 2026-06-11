import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type OnlineTableMatchReportStatus =
  | 'open'
  | 'verifying'
  | 'verified'
  | 'conflict'

export interface IOnlineTableMatchReport extends Document {
  eventId: Types.ObjectId
  roundNum: number
  tableNumber: string
  player1PopId: string
  player2PopId: string
  /** POP del reportador → POP del ganador que reportó */
  claimByPop: Map<string, string>
  status: OnlineTableMatchReportStatus
  winnerPopId?: string | null
  /** Primer reporte en mesa (auto-confirmación si el rival no responde). */
  firstClaimAt?: Date | null
  verifiedAt?: Date | null
}

const OnlineTableMatchReportSchema = new Schema<IOnlineTableMatchReport>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyEvent',
      required: true,
      index: true
    },
    roundNum: { type: Number, required: true, min: 1, max: 99 },
    tableNumber: { type: String, required: true, trim: true, maxlength: 40 },
    player1PopId: { type: String, required: true, trim: true, maxlength: 32 },
    player2PopId: { type: String, required: true, trim: true, maxlength: 32 },
    claimByPop: {
      type: Map,
      of: { type: String, trim: true, maxlength: 32 },
      default: () => new Map()
    },
    status: {
      type: String,
      enum: ['open', 'verifying', 'verified', 'conflict'],
      default: 'open'
    },
    winnerPopId: { type: String, default: null, maxlength: 32 },
    firstClaimAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

OnlineTableMatchReportSchema.index(
  { eventId: 1, roundNum: 1, tableNumber: 1 },
  { unique: true }
)

export default mongoose.models.OnlineTableMatchReport ||
  mongoose.model<IOnlineTableMatchReport>(
    'OnlineTableMatchReport',
    OnlineTableMatchReportSchema
  )
