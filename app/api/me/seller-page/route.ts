import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSellerModuleSession } from '@/lib/seller-module-access'
import { ensureUserSellerSlug } from '@/lib/ensure-user-seller-slug'
import {
  isValidSellerSlug,
  normalizeSellerSlug,
  sellerPublicPath,
  SELLER_SLUG_MAX
} from '@/lib/seller-slug'
import connectDB from '@/lib/mongodb'
import { binderPublishedCountsByUser } from '@/lib/card-binder-counts'
import CardBinder from '@/models/CardBinder'
import User from '@/models/User'

export const runtime = 'nodejs'

async function publishedBinderStats(userOid: mongoose.Types.ObjectId) {
  const binders = await CardBinder.find({ userId: userOid })
    .select('name slug')
    .lean<{ _id: mongoose.Types.ObjectId; name: string; slug?: string }[]>()

  if (!binders.length) {
    return { eligible: false as const, binders: [] as never[] }
  }

  const countMap = await binderPublishedCountsByUser(userOid)
  const withPublished = binders
    .map(b => {
      const slug = typeof b.slug === 'string' ? b.slug.trim().toLowerCase() : ''
      const publishedCount = countMap.get(String(b._id)) ?? 0
      return {
        id: b._id.toString(),
        name: b.name,
        slug,
        publishedCount
      }
    })
    .filter(b => b.slug && b.publishedCount > 0)

  return {
    eligible: withPublished.length > 0,
    binders: withPublished
  }
}

export async function GET() {
  try {
    const gate = await requireSellerModuleSession()
    if (!gate.ok) return gate.response
    const session = gate.session

    await connectDB()
    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const user = await User.findById(userOid)
      .select('name sellerSlug phone')
      .lean<{ name?: string; sellerSlug?: string; phone?: string } | null>()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const stats = await publishedBinderStats(userOid)
    let sellerSlug =
      typeof user.sellerSlug === 'string'
        ? normalizeSellerSlug(user.sellerSlug)
        : ''

    if (stats.eligible && !isValidSellerSlug(sellerSlug)) {
      try {
        sellerSlug = await ensureUserSellerSlug({
          userId: userOid,
          name: user.name
        })
      } catch (e) {
        console.error('ensureUserSellerSlug:', e)
        return NextResponse.json(
          {
            eligible: true,
            sellerSlug: '',
            publicPath: '',
            phone: typeof user.phone === 'string' ? user.phone : '',
            binders: stats.binders,
            error:
              e instanceof Error
                ? e.message
                : 'No se pudo crear el slug de vendedor'
          },
          { status: 500 }
        )
      }
    }

    // Releer por si el schema HMR falló antes y el slug quedó solo en memoria.
    if (stats.eligible && isValidSellerSlug(sellerSlug)) {
      const check = await User.findOne({
        _id: userOid,
        sellerSlug
      })
        .select('_id')
        .lean()
      if (!check) {
        try {
          sellerSlug = await ensureUserSellerSlug({
            userId: userOid,
            name: user.name
          })
        } catch (e) {
          console.error('ensureUserSellerSlug re-save:', e)
        }
      }
    }

    return NextResponse.json({
      eligible: stats.eligible,
      sellerSlug: isValidSellerSlug(sellerSlug) ? sellerSlug : '',
      publicPath:
        stats.eligible && isValidSellerSlug(sellerSlug)
          ? sellerPublicPath(sellerSlug)
          : '',
      phone: typeof user.phone === 'string' ? user.phone : '',
      binders: stats.binders
    })
  } catch (e) {
    console.error('GET /api/me/seller-page:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar la página de vendedor' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const gate = await requireSellerModuleSession()
    if (!gate.ok) return gate.response
    const session = gate.session

    const body = (await request.json().catch(() => ({}))) as {
      sellerSlug?: unknown
    }
    const raw =
      typeof body.sellerSlug === 'string'
        ? body.sellerSlug.slice(0, SELLER_SLUG_MAX)
        : ''
    const sellerSlug = normalizeSellerSlug(raw)
    if (!isValidSellerSlug(sellerSlug)) {
      return NextResponse.json(
        {
          error:
            'Slug inválido. Usa 3–48 caracteres: minúsculas, números y guiones.'
        },
        { status: 400 }
      )
    }

    await connectDB()
    const userOid = new mongoose.Types.ObjectId(session.user.id)
    const clash = await User.exists({
      sellerSlug,
      _id: { $ne: userOid }
    })
    if (clash) {
      return NextResponse.json(
        { error: 'Ese slug ya está en uso. Prueba otro.' },
        { status: 409 }
      )
    }

    await User.updateOne({ _id: userOid }, { $set: { sellerSlug } })
    const stats = await publishedBinderStats(userOid)

    return NextResponse.json({
      eligible: stats.eligible,
      sellerSlug,
      publicPath: stats.eligible ? sellerPublicPath(sellerSlug) : '',
      binders: stats.binders
    })
  } catch (e) {
    console.error('PATCH /api/me/seller-page:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar el slug' },
      { status: 500 }
    )
  }
}
