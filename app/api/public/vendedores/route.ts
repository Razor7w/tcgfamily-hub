import { NextResponse } from 'next/server'
import mongoose, { type Types } from 'mongoose'
import { buildWhatsAppHref } from '@/lib/card-single-whatsapp'
import { isValidSellerSlug, sellerPublicPath } from '@/lib/seller-slug'
import connectDB from '@/lib/mongodb'
import CardPhoto from '@/models/CardPhoto'
import CardSingle from '@/models/CardSingle'
import User from '@/models/User'

export const runtime = 'nodejs'

type UserPubAgg = {
  _id: Types.ObjectId
  publishedItems: number
  binderIds: Types.ObjectId[]
}

async function publishedAggByUser(
  model: typeof CardSingle | typeof CardPhoto
): Promise<UserPubAgg[]> {
  return model.aggregate<UserPubAgg>([
    { $match: { published: true } },
    {
      $group: {
        _id: { userId: '$userId', binderId: '$binderId' },
        items: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.userId',
        publishedItems: { $sum: '$items' },
        binderIds: { $addToSet: '$_id.binderId' }
      }
    }
  ])
}

export async function GET() {
  try {
    await connectDB()

    const [singleAgg, photoAgg] = await Promise.all([
      publishedAggByUser(CardSingle),
      publishedAggByUser(CardPhoto)
    ])

    const stats = new Map<
      string,
      { publishedItems: number; binderIdSet: Set<string> }
    >()

    for (const row of [...singleAgg, ...photoAgg]) {
      const id = row._id.toString()
      const prev = stats.get(id) ?? {
        publishedItems: 0,
        binderIdSet: new Set<string>()
      }
      prev.publishedItems += row.publishedItems
      for (const b of row.binderIds) {
        prev.binderIdSet.add(b.toString())
      }
      stats.set(id, prev)
    }

    const userOids = [...stats.keys()]
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id))
    if (!userOids.length) {
      return NextResponse.json({ sellers: [] })
    }

    const users = await User.find({
      _id: { $in: userOids },
      sellerSlug: { $exists: true, $type: 'string', $gt: '' }
    })
      .select('name sellerSlug phone image')
      .lean<
        {
          _id: Types.ObjectId
          name?: string
          sellerSlug?: string
          phone?: string
          image?: string
        }[]
      >()

    const sellers = users
      .map(u => {
        const slug =
          typeof u.sellerSlug === 'string'
            ? u.sellerSlug.trim().toLowerCase()
            : ''
        if (!isValidSellerSlug(slug)) return null
        const s = stats.get(u._id.toString())
        if (!s || s.publishedItems < 1) return null
        const phone = typeof u.phone === 'string' ? u.phone.trim() : ''
        const name = (u.name ?? 'Vendedor').trim() || 'Vendedor'
        return {
          id: u._id.toString(),
          name,
          slug,
          image: typeof u.image === 'string' ? u.image.trim() : '',
          phone,
          whatsappHref: buildWhatsAppHref(phone),
          publicPath: sellerPublicPath(slug),
          publishedItems: s.publishedItems,
          publishedBinders: s.binderIdSet.size
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      )

    return NextResponse.json({ sellers })
  } catch (e) {
    console.error('GET /api/public/vendedores:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los vendedores' },
      { status: 500 }
    )
  }
}
