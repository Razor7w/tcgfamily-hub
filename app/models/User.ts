import mongoose, { Schema, Document, Types } from 'mongoose'

export type UserRole = 'user' | 'admin'

export interface IUserStoreCreditSlice {
  storeId: Types.ObjectId
  storePoints: number
  storePointsExpiringNext: number
  storePointsExpiryDate?: Date
}

export interface IUser extends Document {
  name?: string
  email?: string
  emailVerified?: Date
  image?: string
  /** Key del objeto en R2 para poder borrar/reemplazar. */
  imageKey?: string
  /** Solo usuarios con contraseña local; nunca exponer en APIs. */
  passwordHash?: string
  /** Tras reset admin: obligar cambio en el próximo inicio con contraseña local. */
  mustChangePassword: boolean
  credentialFailedAttempts?: number
  credentialLockedUntil?: Date
  role: UserRole
  phone: string
  rut: string
  popid: string
  /** Tienda preferida al iniciar sesión (si sigue accesible). `null` = sin preferencia. */
  defaultStoreId?: Types.ObjectId | null
  /** Puntos / crédito de tienda (columna Saldo del reporte). */
  storePoints: number
  /** Próximos puntos a vencer. */
  storePointsExpiringNext: number
  /** Fecha de vencimiento del bloque más próximo (si aplica). */
  storePointsExpiryDate?: Date
  /** Wallet por tienda (import CSV y UI usan tienda activa). */
  storeCredits: IUserStoreCreditSlice[]
  /** Ocultar insignia de contribución en meta de torneo y rankings. */
  contributionHideBadge?: boolean
  accounts: mongoose.Types.ObjectId[]
  sessions: mongoose.Types.ObjectId[]
}

const UserSchema = new Schema<IUser>(
  {
    name: String,
    email: String,
    emailVerified: Date,
    image: String,
    imageKey: {
      type: String,
      default: ''
    },
    passwordHash: {
      type: String,
      select: false,
      default: undefined
    },
    mustChangePassword: {
      type: Boolean,
      default: false
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
    defaultStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: false
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
    storeCredits: {
      type: [
        new Schema<IUserStoreCreditSlice>(
          {
            storeId: {
              type: Schema.Types.ObjectId,
              ref: 'Store',
              required: true
            },
            storePoints: { type: Number, default: 0 },
            storePointsExpiringNext: { type: Number, default: 0 },
            storePointsExpiryDate: { type: Date, required: false }
          },
          { _id: false }
        )
      ],
      default: []
    },
    contributionHideBadge: {
      type: Boolean,
      default: false
    },
    accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }],
    sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }]
  },
  {
    // Asegurar que los defaults se apliquen incluso si el modelo ya existía
    strict: true
  }
)

UserSchema.index({ rut: 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
