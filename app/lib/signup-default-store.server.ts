import 'server-only'

import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { mailModuleEnabledByStoreId } from '@/lib/load-dashboard-module-settings'

export type SignupStoreOption = {
  id: string
  name: string
  slug: string
  mailEnabled: boolean
}

export async function listActiveStoresForSignup(): Promise<
  SignupStoreOption[]
> {
  await connectDB()
  const rows = await Store.find({ isActive: true })
    .sort({ createdAt: 1 })
    .select('_id name slug')
    .lean<Array<{ _id: mongoose.Types.ObjectId; name: string; slug: string }>>()
  const ids = rows.map(r => String(r._id))
  const mailByStore = await mailModuleEnabledByStoreId(ids)
  return rows.map(r => {
    const id = String(r._id)
    return {
      id,
      name: r.name,
      slug: r.slug,
      mailEnabled: mailByStore.get(id) !== false
    }
  })
}

export async function resolveValidSignupStoreObjectId(
  raw: string | undefined | null
): Promise<
  { ok: true; objectId: mongoose.Types.ObjectId } | { ok: false; error: string }
> {
  const t = (raw ?? '').trim()
  if (!t) {
    return { ok: false, error: 'Debes elegir una tienda de preferencia.' }
  }
  if (!mongoose.Types.ObjectId.isValid(t)) {
    return { ok: false, error: 'Tienda inválida.' }
  }
  await connectDB()
  const oid = new mongoose.Types.ObjectId(t)
  const exists = await Store.exists({ _id: oid, isActive: true })
  if (!exists) {
    return { ok: false, error: 'La tienda indicada no está disponible.' }
  }
  return { ok: true, objectId: oid }
}
