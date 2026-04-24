import mongoose, { Schema, type Document } from 'mongoose'
import type { DashboardModuleId } from '@/lib/dashboard-module-config'
import { DEFAULT_DASHBOARD_ORDER } from '@/lib/dashboard-module-config'

export interface IDashboardModuleSettings extends Document {
  visibility: {
    weeklyEvents: boolean
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
}

const DashboardModuleSettingsSchema = new Schema<IDashboardModuleSettings>(
  {
    visibility: {
      weeklyEvents: { type: Boolean, default: true },
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
    mailRegisterDailyLimit: { type: Number, default: 10, min: 1 }
  },
  { timestamps: true }
)

export default mongoose.models.DashboardModuleSettings ||
  mongoose.model<IDashboardModuleSettings>(
    'DashboardModuleSettings',
    DashboardModuleSettingsSchema
  )
