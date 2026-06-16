import mongoose, { Schema, type Document, type Types } from 'mongoose'

export type MatchChatMessageKind = 'user' | 'system'

export interface IMatchChatMessage extends Document {
  eventId: Types.ObjectId
  roundNum: number
  tableNumber: string
  senderUserId?: Types.ObjectId
  senderDisplayName: string
  message: string
  kind: MatchChatMessageKind
  createdAt: Date
}

const MatchChatMessageSchema = new Schema<IMatchChatMessage>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyEvent',
      required: true,
      index: true
    },
    roundNum: { type: Number, required: true, min: 1, max: 99 },
    tableNumber: { type: String, required: true, trim: true, maxlength: 40 },
    senderUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    senderDisplayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    kind: {
      type: String,
      required: true,
      enum: ['user', 'system'],
      default: 'user'
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

MatchChatMessageSchema.index({
  eventId: 1,
  roundNum: 1,
  tableNumber: 1,
  createdAt: 1
})

MatchChatMessageSchema.index({
  eventId: 1,
  roundNum: 1,
  tableNumber: 1,
  _id: 1
})

export default mongoose.models.MatchChatMessage ||
  mongoose.model<IMatchChatMessage>('MatchChatMessage', MatchChatMessageSchema)
