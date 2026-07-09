import mongoose, { Schema, Document, Types } from 'mongoose'
import {
  PLAY_POKEMON_LEADERBOARD_DIVISIONS,
  type PlayPokemonLeaderboardDivision
} from '@/lib/play-pokemon-leaderboard/constants'

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
  /** CP ingresados manualmente en Mi perfil (Play! Pokémon). */
  playPokemonChampionshipPoints?: number | null
  /** Clasificación ingresada manualmente en Mi perfil. */
  playPokemonChampionshipRank?: number | null
  /** Play! Points ingresados manualmente en Mi perfil. */
  playPokemonPlayPoints?: number | null
  /** División Play! Pokémon (masters / seniors / juniors). */
  playPokemonDivision?: PlayPokemonLeaderboardDivision | null
  /** Display name del leaderboard al vincular fila. */
  playPokemonLinkedDisplayName?: string | null
  /** Última actualización del leaderboard al vincular fila. */
  playPokemonLeaderboardUpdatedAt?: Date | null
  /** Periodo SPAR activo al vincular (temporada). */
  playPokemonSeasonPeriod?: string | null
  /** Etiqueta legible de la temporada vinculada (p. ej. «2026»). */
  playPokemonSeasonLabel?: string | null
  /** Mostrar # de ranking junto al nombre en la plataforma. */
  playPokemonRankPublic?: boolean
  /** Historial de vinculaciones anteriores por temporada. */
  playPokemonHistory?: IUserPlayPokemonHistoryEntry[]
  accounts: mongoose.Types.ObjectId[]
  sessions: mongoose.Types.ObjectId[]
}

export interface IUserPlayPokemonHistoryEntry {
  period: string
  seasonLabel: string
  division: PlayPokemonLeaderboardDivision
  rank: number
  championshipPoints: number
  playPoints: number
  linkedDisplayName: string
  leaderboardUpdatedAt?: Date
  archivedAt: Date
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
    playPokemonChampionshipPoints: {
      type: Number,
      default: null,
      min: 0,
      max: 99999
    },
    playPokemonChampionshipRank: {
      type: Number,
      default: null,
      min: 1,
      max: 999999
    },
    playPokemonPlayPoints: {
      type: Number,
      default: null,
      min: 0,
      max: 99999
    },
    playPokemonDivision: {
      type: String,
      enum: PLAY_POKEMON_LEADERBOARD_DIVISIONS,
      default: undefined
    },
    playPokemonLinkedDisplayName: {
      type: String,
      default: undefined,
      maxlength: 120
    },
    playPokemonLeaderboardUpdatedAt: {
      type: Date,
      default: undefined
    },
    playPokemonSeasonPeriod: {
      type: String,
      default: undefined,
      maxlength: 64
    },
    playPokemonSeasonLabel: {
      type: String,
      default: undefined,
      maxlength: 32
    },
    playPokemonRankPublic: {
      type: Boolean,
      default: false
    },
    playPokemonHistory: {
      type: [
        new Schema<IUserPlayPokemonHistoryEntry>(
          {
            period: { type: String, required: true, maxlength: 64 },
            seasonLabel: { type: String, required: true, maxlength: 32 },
            division: {
              type: String,
              enum: PLAY_POKEMON_LEADERBOARD_DIVISIONS,
              required: true
            },
            rank: { type: Number, required: true, min: 1, max: 999999 },
            championshipPoints: {
              type: Number,
              required: true,
              min: 0,
              max: 99999
            },
            playPoints: { type: Number, required: true, min: 0, max: 99999 },
            linkedDisplayName: {
              type: String,
              required: true,
              maxlength: 120
            },
            leaderboardUpdatedAt: { type: Date, required: false },
            archivedAt: { type: Date, required: true }
          },
          { _id: false }
        )
      ],
      default: []
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
UserSchema.index({
  playPokemonRankPublic: 1,
  defaultStoreId: 1,
  playPokemonChampionshipRank: 1
})

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
