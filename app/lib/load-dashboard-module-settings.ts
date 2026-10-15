import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import {
  mergeDashboardSettings,
  type DashboardModuleSettingsDTO
} from '@/lib/dashboard-module-config'
import { mergeContributionPointsAdmin } from '@/lib/contribution-points-admin-settings'
import { mergeStoreCreditAdmin } from '@/lib/store-credit-admin-settings'
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
    docLean = (await DashboardModuleSettings.findOne(
      filter
    ).lean()) as typeof docLean
    if (!docLean) {
      docLean = (await DashboardModuleSettings.findOne({
        storeId: activeOid
      }).lean()) as typeof docLean
    }
  } else {
    docLean = (await DashboardModuleSettings.findOne().lean()) as typeof docLean
  }

  const d = docLean as typeof docLean & {
    storeCreditCsvEnabled?: boolean
    storeCreditTournamentPointsEnabled?: boolean
    tournamentPointsEnabled?: boolean
    contributionPointsEnabled?: boolean
    contributionTierThresholds?: number[]
    contributionTierLabels?: string[]
    contributionPointRules?: Record<string, number>
  }
  const base = mergeDashboardSettings(
    d
      ? {
          visibility: d.visibility,
          order: d.order,
          shortcuts: d.shortcuts
        }
      : null
  )
  return {
    ...base,
    storeCredit: mergeStoreCreditAdmin(d ?? null),
    contributionPoints: mergeContributionPointsAdmin(d ?? null)
  }
}

/** Correo habilitado en la tienda (módulo `visibility.mail`). */
export async function isMailModuleEnabledForStore(
  storeId: string
): Promise<boolean> {
  const settings = await loadDashboardModuleSettings(storeId)
  return settings.visibility.mail !== false
}

/**
 * `visibility.mail` por tienda. Sin documento propio, el default es habilitado.
 * Un documento legacy sin `storeId` aplica solo a la tienda primaria.
 */
export async function mailModuleEnabledByStoreId(
  storeIds: string[]
): Promise<Map<string, boolean>> {
  await connectDB()
  const primary = await memoPrimaryTcgfamilyStoreObjectId()
  const primaryId = primary?.toString() ?? ''
  const oids = storeIds
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id))

  const docs = await DashboardModuleSettings.find({
    $or: [
      { storeId: { $in: oids } },
      { storeId: { $exists: false } },
      { storeId: null }
    ]
  })
    .select('storeId visibility.mail')
    .lean<
      Array<{
        storeId?: mongoose.Types.ObjectId | null
        visibility?: { mail?: boolean }
      }>
    >()

  const explicit = new Map<string, boolean>()
  let legacyMail: boolean | undefined
  for (const doc of docs) {
    const enabled = doc.visibility?.mail !== false
    const sid = doc.storeId ? String(doc.storeId) : ''
    if (sid) explicit.set(sid, enabled)
    else legacyMail = enabled
  }

  const out = new Map<string, boolean>()
  for (const id of storeIds) {
    if (explicit.has(id)) out.set(id, explicit.get(id) === true)
    else if (primaryId && id === primaryId && legacyMail !== undefined) {
      out.set(id, legacyMail)
    } else out.set(id, true)
  }
  return out
}
