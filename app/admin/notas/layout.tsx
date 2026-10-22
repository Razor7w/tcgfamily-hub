import { redirect } from 'next/navigation'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { isTcgFamilyStoreSlug } from '@/lib/store-points-clp'
import Store from '@/models/Store'

export default async function NotasLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const role = session?.user?.storeRole
  const aid = session?.user?.activeStoreId?.trim() ?? ''
  const isStaff = role === 'owner' || role === 'store_admin'
  if (!isStaff || !mongoose.Types.ObjectId.isValid(aid)) {
    redirect('/admin')
  }

  await connectDB()
  const store = await Store.findById(aid)
    .select('slug')
    .lean<{ slug?: string } | null>()
  if (!isTcgFamilyStoreSlug(store?.slug)) {
    redirect('/admin')
  }

  return children
}
