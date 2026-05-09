import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  mergeDashboardSettings,
  type DashboardModuleSettingsDTO
} from '@/lib/dashboard-module-config'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'
import { memoPrimaryTcgfamilyStoreObjectId } from '@/lib/multitenancy/primary-store'

async function scopedFilter(activeOid: mongoose.Types.ObjectId) {
  await connectDB()
  const primary = await memoPrimaryTcgfamilyStoreObjectId()
  if (primary?.equals(activeOid)) {
    return {
      $or: [{ storeId: activeOid }, { storeId: { $exists: false } }]
    }
  }
  return { storeId: activeOid }
}

/**
 * Lectura en servidor para layouts (sin API pública).
 * Con `activeStoreMongoId`, filtra configuración multitenant por tienda.
 */
export async function loadDashboardModuleSettings(
  activeStoreMongoId?: string | null
): Promise<DashboardModuleSettingsDTO> {
  await connectDB()

  let docLean:
    | {
        visibility?: DashboardModuleSettingsDTO['visibility']
        order?: DashboardModuleSettingsDTO['order']
        shortcuts?: DashboardModuleSettingsDTO['shortcuts']
      }
    | null
    | undefined

  if (
    typeof activeStoreMongoId === 'string' &&
    mongoose.Types.ObjectId.isValid(activeStoreMongoId.trim())
  ) {
    const activeOid = new mongoose.Types.ObjectId(activeStoreMongoId.trim())
    const filter = await scopedFilter(activeOid)
    docLean = (await DashboardModuleSettings.findOne(filter).lean()) as typeof docLean
    if (!docLean) {
      docLean = (await DashboardModuleSettings.findOne({
        storeId: activeOid
      }).lean()) as typeof docLean
    }
  } else {
    docLean = (await DashboardModuleSettings.findOne().lean()) as typeof docLean
  }

  const d = docLean as typeof docLean
  return mergeDashboardSettings(
    d
      ? {
          visibility: d.visibility,
          order: d.order,
          shortcuts: d.shortcuts
        }
      : null
  )
}
