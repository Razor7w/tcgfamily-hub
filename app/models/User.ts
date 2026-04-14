import mongoose, { Schema, Document } from 'mongoose'

export type UserRole = 'user' | 'admin'

export interface IUser extends Document {
  name?: string
  email?: string
  emailVerified?: Date
  image?: string
  /** Solo usuarios con contraseña local; nunca exponer en APIs. */
  passwordHash?: string
  credentialFailedAttempts?: number
  credentialLockedUntil?: Date
  role: UserRole
  phone: string
  rut: string
  popid: string
  /** Puntos / crédito de tienda (columna Saldo del reporte). */
  storePoints: number
  /** Próximos puntos a vencer. */
  storePointsExpiringNext: number
  /** Fecha de vencimiento del bloque más próximo (si aplica). */
  storePointsExpiryDate?: Date
  accounts: mongoose.Types.ObjectId[]
  sessions: mongoose.Types.ObjectId[]
}

const UserSchema = new Schema<IUser>(
  {
    name: String,
    email: String,
    emailVerified: Date,
    image: String,
    passwordHash: {
      type: String,
      select: false,
      default: undefined
    },
    credentialFailedAttempts: {
      type: Number,
      default: 0
    },
    credentialLockedUntil: {
      type: Date,
      default: undefined
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      required: true
    },
    phone: {
      type: String,
      default: ''
    },
    rut: {
      type: String,
      default: ''
    },
    popid: {
      type: String,
      default: ''
    },
    storePoints: {
      type: Number,
      default: 0
    },
    storePointsExpiringNext: {
      type: Number,
      default: 0
    },
    storePointsExpiryDate: {
      type: Date
    },
    accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }]
  },
  {
    // Asegurar que los defaults se apliquen incluso si el modelo ya existía
    strict: true
  }
)

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
