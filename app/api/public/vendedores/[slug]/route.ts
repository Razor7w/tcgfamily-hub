import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { buildWhatsAppHref } from '@/lib/card-single-whatsapp'
import {
  isValidSellerSlug,
  normalizeSellerSlug,
  sellerBinderPublicPath,
  sellerPublicPath
} from '@/lib/seller-slug'
import connectDB from '@/lib/mongodb'
import { binderPublishedCountsByUser } from '@/lib/card-binder-counts'
import CardBinder from '@/models/CardBinder'
import User from '@/models/User'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: Ctx) {
  try {
    const { slug: raw } = await context.params
    const slug = normalizeSellerSlug(
      typeof raw === 'string' ? decodeURIComponent(raw) : ''
    )
    if (!isValidSellerSlug(slug)) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    await connectDB()
    const seller = await User.findOne({ sellerSlug: slug })
      .select('name phone sellerSlug')
      .lean<{
        _id: mongoose.Types.ObjectId
        name?: string
        phone?: string
        sellerSlug?: string
      } | null>()

    if (!seller) {
      return NextResponse.json(
        { error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    const binders = await CardBinder.find({ userId: seller._id })
      .select('name slug description')
      .sort({ updatedAt: -1 })
      .lean<
        {
          _id: mongoose.Types.ObjectId
          name: string
          slug?: string
          description?: string
        }[]
      >()

    const countMap = await binderPublishedCountsByUser(seller._id)

    const publicBinders = binders
      .map(b => {
        const binderSlug =
          typeof b.slug === 'string' ? b.slug.trim().toLowerCase() : ''
        const publishedCount = countMap.get(String(b._id)) ?? 0
        return {
          id: b._id.toString(),
          name: b.name,
          slug: binderSlug,
          description: b.description ?? '',
          publishedCount,
          path: binderSlug
            ? sellerBinderPublicPath(slug, binderSlug)
            : ''
        }
      })
      .filter(b => b.slug && b.publishedCount > 0)

    if (!publicBinders.length) {
      return NextResponse.json(
        {
          error:
            'Este vendedor aún no tiene carpetas con cartas publicadas.'
        },
        { status: 404 }
      )
    }

    const phone = typeof seller.phone === 'string' ? seller.phone.trim() : ''
    const name = (seller.name ?? 'Vendedor').trim() || 'Vendedor'

    return NextResponse.json({
      seller: {
        id: seller._id.toString(),
        name,
        slug,
        phone,
        whatsappHref: buildWhatsAppHref(phone),
        publicPath: sellerPublicPath(slug)
      },
      binders: publicBinders
    })
  } catch (e) {
    console.error('GET /api/public/vendedores/[slug]:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar el vendedor' },
      { status: 500 }
    )
  }
}
