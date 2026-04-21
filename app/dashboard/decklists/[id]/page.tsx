import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import SavedDecklist from '@/models/SavedDecklist'
import { formatClDateTimeMedium } from '@/lib/format-cl-date'
import DecklistDetailClient from '../DecklistDetailClient'

export default async function SavedDecklistPage({
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
  const uid = new mongoose.Types.ObjectId(session.user.id)
  const oid = new mongoose.Types.ObjectId(id.trim())

  const doc = await SavedDecklist.findOne({ _id: oid, userId: uid })
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

  const initial = {
    id: doc._id.toString(),
    name: doc.name,
    deckText: doc.deckText,
    pokemonSlugs: Array.isArray(doc.pokemonSlugs) ? doc.pokemonSlugs : [],
    variants,
    principalVariantId,
    updatedAt: doc.updatedAt.toISOString(),
    updatedAtLabel: formatClDateTimeMedium(doc.updatedAt)
  }

  return <DecklistDetailClient initial={initial} />
}
