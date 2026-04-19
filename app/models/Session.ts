import mongoose, { Schema, Document } from 'mongoose'

export interface ISession extends Document {
  sessionToken: string
  userId: mongoose.Types.ObjectId
  expires: Date
}

const SessionSchema = new Schema<ISession>({
  sessionToken: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expires: { type: Date, required: true }
})

export default mongoose.models.Session ||
  mongoose.model<ISession>('Session', SessionSchema)
