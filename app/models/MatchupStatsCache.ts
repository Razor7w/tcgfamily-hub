import mongoose, { Schema, Document, Types } from 'mongoose'
import type { TournamentOriginFilter } from '@/lib/pokemon-matchup-stats'

export type MatchupStatsCacheView = 'overview' | 'deck-detail'

export interface IMatchupStatsCache extends Document {
  userId: Types.ObjectId
  view: MatchupStatsCacheView
  origin: TournamentOriginFilter
  myDeckKey: string
  payload: Record<string, unknown>
  builtAt: Date
}

const MatchupStatsCacheSchema = new Schema<IMatchupStatsCache>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    view: {
      type: String,
      enum: ['overview', 'deck-detail'],
      required: true
    },
    origin: {
      type: String,
      enum: ['all', 'official', 'custom'],
      required: true
    },
    myDeckKey: { type: String, default: '', maxlength: 2000 },
    payload: { type: Schema.Types.Mixed, required: true },
    builtAt: { type: Date, required: true }
  },
  { timestamps: true, strict: true }
)

/** Lookup por usuario + vista + filtros (`GET /api/events/my-matchup-stats`). */
MatchupStatsCacheSchema.index(
  { userId: 1, view: 1, origin: 1, myDeckKey: 1 },
  { unique: true }
)

if (mongoose.models.MatchupStatsCache) {
  delete mongoose.models.MatchupStatsCache
}

export default mongoose.model<IMatchupStatsCache>(
  'MatchupStatsCache',
  MatchupStatsCacheSchema
)
