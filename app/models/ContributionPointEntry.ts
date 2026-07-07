import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type {
  ContributionPointAction,
  ContributionPointCategory,
  ContributionPointSourceType
} from '@/lib/contribution-points/types'

export interface IContributionPointEntry extends Document {
  storeId: Types.ObjectId
  userId: Types.ObjectId
  category: ContributionPointCategory
  action: ContributionPointAction
  points: number
  dedupeKey: string
  sourceType?: ContributionPointSourceType
  sourceId?: Types.ObjectId
  metadata?: {
    eventTitle?: string
    roundNum?: number
    [key: string]: unknown
  }
}

const ContributionPointEntrySchema = new Schema<IContributionPointEntry>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      enum: ['tournament', 'tournament_deck', 'tournament_log', 'mail']
    },
    action: {
      type: String,
      required: true,
      enum: [
        'own_deck_reported',
        'decklist_ref',
        'opponent_sprites',
        'round_complete',
        'mail_received_in_store',
        'mail_withdrawn_in_store',
        'tournament_pre_registered',
        'tournament_participated',
        'tournament_custom_linked',
        /** @deprecated ledger histórico */
        'mail_registered'
      ]
    },
    points: { type: Number, required: true, min: 0, max: 999_999 },
    dedupeKey: { type: String, required: true, trim: true, maxlength: 320 },
    sourceType: {
      type: String,
      required: false,
      enum: ['weekly_event', 'mail']
    },
    sourceId: { type: Schema.Types.ObjectId, required: false },
    metadata: { type: Schema.Types.Mixed, required: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

ContributionPointEntrySchema.index(
  { storeId: 1, dedupeKey: 1 },
  { unique: true }
)
ContributionPointEntrySchema.index({ storeId: 1, userId: 1, createdAt: -1 })
ContributionPointEntrySchema.index({ storeId: 1, userId: 1, category: 1 })
ContributionPointEntrySchema.index({ storeId: 1, createdAt: -1 })

export default mongoose.models.ContributionPointEntry ||
  mongoose.model<IContributionPointEntry>(
    'ContributionPointEntry',
    ContributionPointEntrySchema
  )
