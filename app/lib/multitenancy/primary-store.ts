import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import type { Types } from 'mongoose'

let memoId: Types.ObjectId | undefined

export async function getPrimaryTcgfamilyStoreObjectId(): Promise<Types.ObjectId | null> {
  await connectDB()
  const s = await Store.findOne({
    slug: DEFAULT_PRIMARY_STORE_SLUG
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>()
  if (!s) return null
  memoId = s._id
  return s._id
}

/** Id en proceso caliente dentro de una invocación serverless (mejor que nada). */
export async function memoPrimaryTcgfamilyStoreObjectId(): Promise<Types.ObjectId | null> {
  if (memoId) return memoId
  return getPrimaryTcgfamilyStoreObjectId()
}
