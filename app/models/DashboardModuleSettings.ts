import mongoose, { Schema, type Document, type Types } from 'mongoose'
import type { DashboardModuleId } from '@/lib/dashboard-module-config'
import { DEFAULT_DASHBOARD_ORDER } from '@/lib/dashboard-module-config'

export interface IDashboardModuleSettings extends Document {
  /** Una fila por tienda; legacy sin campo se trata como default en lectura. */
  storeId?: Types.ObjectId
  visibility: {
    weeklyEvents: boolean
    leagues: boolean
    recentPublicDecklists: boolean
    myTournaments: boolean
    statistics: boolean
    mail: boolean
    storePoints: boolean
  }
  order: DashboardModuleId[]
  /** Accesos rápidos en /dashboard (registrar correo, torneo, lista PDF). */
  shortcuts?: {
    createMail: boolean
    createTournament: boolean
    playPokemonDecklistPdf?: boolean
  }
  /** Aviso Resend al usuario cuando el admin marca el envío como recepcionado en tienda. */
  resendNotifyPickupInStoreEnabled: boolean
  /** Máximo de registros de correo (onlyReceptor) por usuario y día (hora Chile). */
  mailRegisterDailyLimit: number
  /** @deprecated Usar storeCreditTournamentPointsEnabled */
  tournamentPointsEnabled?: boolean
  /** Import CSV de saldo en /admin/puntos */
  storeCreditCsvEnabled: boolean
  /** Reparto y gestión de puntos por torneo en /admin/puntos */
  storeCreditTournamentPointsEnabled: boolean
  /** Nombre visible de los puntos por torneo (vacío = «Puntos por torneo») */
  tournamentPointsDisplayName?: string
}

const DashboardModuleSettingsSchema = new Schema<IDashboardModuleSettings>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
      default: undefined
    },
    visibility: {
      weeklyEvents: { type: Boolean, default: true },
      leagues: { type: Boolean, default: true },
      recentPublicDecklists: { type: Boolean, default: true },
      myTournaments: { type: Boolean, default: true },
      statistics: { type: Boolean, default: true },
      mail: { type: Boolean, default: true },
      storePoints: { type: Boolean, default: true }
    },
    order: {
      type: [String],
      default: () => [...DEFAULT_DASHBOARD_ORDER]
    },
    shortcuts: {
      createMail: { type: Boolean, default: true },
      createTournament: { type: Boolean, default: true },
      playPokemonDecklistPdf: { type: Boolean, default: true }
    },
    resendNotifyPickupInStoreEnabled: { type: Boolean, default: true },
    mailRegisterDailyLimit: { type: Number, default: 10, min: 1 },
    tournamentPointsEnabled: { type: Boolean, default: false },
    storeCreditCsvEnabled: { type: Boolean, default: true },
    storeCreditTournamentPointsEnabled: { type: Boolean, default: false },
    tournamentPointsDisplayName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 60,
      default: undefined
    }
  },
  { timestamps: true }
)

DashboardModuleSettingsSchema.index(
  { storeId: 1 },
  { unique: true, partialFilterExpression: { storeId: { $exists: true } } }
)

export default mongoose.models.DashboardModuleSettings ||
  mongoose.model<IDashboardModuleSettings>(
    'DashboardModuleSettings',
    DashboardModuleSettingsSchema
  )
