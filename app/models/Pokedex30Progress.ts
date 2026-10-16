import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IPokedex30Progress extends Document {
  userId: Types.ObjectId
  cardIds: string[]
}

const Pokedex30ProgressSchema = new Schema<IPokedex30Progress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    cardIds: {
      type: [String],
      default: []
    }
  },
  { timestamps: true, strict: true, collection: 'pokedex30progresses' }
)

Pokedex30ProgressSchema.index({ userId: 1 }, { unique: true })

if (mongoose.models.Pokedex30Progress) {
  delete mongoose.models.Pokedex30Progress
}

export default mongoose.model<IPokedex30Progress>(
  'Pokedex30Progress',
  Pokedex30ProgressSchema
)
