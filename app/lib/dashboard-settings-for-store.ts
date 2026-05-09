import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'
import type { HydratedDocument } from 'mongoose'
import type { IDashboardModuleSettings } from '@/models/DashboardModuleSettings'
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
 * Hydrata el documento de configuración dashboard para una tienda (único por storeId).
 */
export async function getDashboardDocForStore(
  activeStoreMongoId: string
): Promise<HydratedDocument<IDashboardModuleSettings>> {
  if (!mongoose.Types.ObjectId.isValid(activeStoreMongoId)) {
    throw new Error('activeStoreMongoId inválido')
  }
  const activeOid = new mongoose.Types.ObjectId(activeStoreMongoId)
  await connectDB()
  const filter = await scopedFilter(activeOid)
  let doc = await DashboardModuleSettings.findOne(filter)
  if (
    !doc &&
    (await memoPrimaryTcgfamilyStoreObjectId())?.equals(activeOid)
  ) {
    doc = await DashboardModuleSettings.findOne({
      storeId: { $exists: false }
    })
    if (doc && !(doc.storeId instanceof mongoose.Types.ObjectId)) {
      doc.set('storeId', activeOid)
      await doc.save()
    }
  }
  if (!doc) {
    doc = await DashboardModuleSettings.findOne({
      storeId: activeOid
    })
  }
  if (!doc) {
    doc = await DashboardModuleSettings.create({
      storeId: activeOid
    })
  } else if (!doc.storeId) {
    doc.set('storeId', activeOid)
    await doc.save()
  }
  return doc as HydratedDocument<IDashboardModuleSettings>
}
