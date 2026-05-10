import mongoose from 'mongoose'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'

export default async function TiendasLegacyRedirect() {
  const session = await auth()
  const aid = session?.user?.activeStoreId?.trim()
  if (!aid || !mongoose.Types.ObjectId.isValid(aid)) {
    redirect('/dashboard')
  }

  await connectDB()
  const doc = await Store.findById(aid).select('slug').lean<{
    slug?: string
  }>()
  const slug = typeof doc?.slug === 'string' ? doc.slug.trim() : ''
  if (!slug) {
    redirect('/dashboard')
  }

  redirect(`/${encodeURIComponent(slug)}`)
}
