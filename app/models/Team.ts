import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { TeamApprovalStatus } from '@/lib/teams/constants'

export interface ITeam extends Document {
  name: string
  /** Slug único global (sin alcance de tienda). */
  slug: string
  bio: string
  logoUrl: string
  logoKey: string
  coverUrl: string
  coverKey: string
  captainUserId: Types.ObjectId
  approvalStatus: TeamApprovalStatus
  reviewedAt?: Date
  reviewedByUserId?: Types.ObjectId
  rejectionReason?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    },
    bio: { type: String, default: '', maxlength: 2000 },
    logoUrl: { type: String, default: '' },
    logoKey: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    coverKey: { type: String, default: '' },
    captainUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
      index: true
    },
    reviewedAt: { type: Date, default: undefined },
    reviewedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined
    },
    rejectionReason: { type: String, default: '', maxlength: 500 },
    isActive: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, strict: true }
)

TeamSchema.index({ slug: 1 }, { unique: true })
TeamSchema.index({ approvalStatus: 1, createdAt: -1 })
TeamSchema.index({ approvalStatus: 1, isActive: 1, createdAt: -1 })
TeamSchema.index({ isActive: 1, updatedAt: -1 })
TeamSchema.index(
  { captainUserId: 1, approvalStatus: 1 },
  { partialFilterExpression: { approvalStatus: 'pending' } }
)

if (mongoose.models.Team) {
  delete mongoose.models.Team
}

export default mongoose.model<ITeam>('Team', TeamSchema)
