import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import SavedDecklist from '@/models/SavedDecklist'
import User from '@/models/User'
import { formatClDateTimeMedium } from '@/lib/format-cl-date'
import PublicDecklistDetailClient from '../PublicDecklistDetailClient'

export default async function PublicDecklistDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/')
  }

  const { id } = await params
  if (!id?.trim() || !mongoose.Types.ObjectId.isValid(id.trim())) {
    notFound()
  }

  await connectDB()
  const oid = new mongoose.Types.ObjectId(id.trim())

  const doc = await SavedDecklist.findOne({
    _id: oid,
    isPublic: true
  }).exec()

  if (!doc) {
    notFound()
  }

  const variants = Array.isArray(doc.variants)
    ? doc.variants.map(
        (v: {
          _id: mongoose.Types.ObjectId
          label: string
          deckText: string
        }) => ({
          id: v._id.toString(),
          label: v.label,
          deckText: v.deckText
        })
      )
    : []

  const principalVariantId =
    doc.principalVariantId != null ? doc.principalVariantId.toString() : null

  const ownerDoc = await User.findById(doc.userId)
    .select('name email image')
    .lean()
  const { displayName: ownerName, imageUrl: ownerImage } = ownerPublicDisplay(
    ownerDoc as {
      name?: string | null
      email?: string | null
      image?: string | null
    } | null
  )

  return (
    <PublicDecklistDetailClient
      name={doc.name}
      pokemonSlugs={Array.isArray(doc.pokemonSlugs) ? doc.pokemonSlugs : []}
      updatedAtLabel={formatClDateTimeMedium(doc.updatedAt)}
      ownerName={ownerName}
      ownerImage={ownerImage}
      baseDeckText={doc.deckText}
      principalVariantId={principalVariantId}
      variants={variants}
    />
  )
}
