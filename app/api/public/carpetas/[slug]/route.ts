import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { isCardSingleCondition } from '@/lib/card-single-condition'
import { isCardSingleLanguage } from '@/lib/card-single-language'
import { toCardSingleDTO } from '@/lib/card-single-dto'
import { buildWhatsAppHref } from '@/lib/card-single-whatsapp'
import { normalizeCardBinderSlug } from '@/lib/card-binder-slug'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'
import CardSingle from '@/models/CardSingle'
import CardSingleInterest from '@/models/CardSingleInterest'
import User from '@/models/User'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ slug: string }> }

const PAGE_MAX = 48

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const { slug: raw } = await context.params
    const slug = normalizeCardBinderSlug(
      typeof raw === 'string' ? decodeURIComponent(raw) : ''
    )
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') ?? '').trim().slice(0, 80)
    const setFilter = (searchParams.get('set') ?? '').trim().toUpperCase()
    const conditionRaw = searchParams.get('condition')
    const languageRaw = searchParams.get('language')
    const page = Math.max(1, Math.round(Number(searchParams.get('page') ?? 1)))
    const limit = Math.min(
      PAGE_MAX,
      Math.max(1, Math.round(Number(searchParams.get('limit') ?? 24)))
    )

    await connectDB()

    const binder = await CardBinder.findOne({ slug })
      .select('_id userId name slug description')
      .lean<{
        _id: mongoose.Types.ObjectId
        userId: mongoose.Types.ObjectId
        name: string
        slug: string
        description?: string
      } | null>()

    if (!binder) {
      return NextResponse.json(
        { error: 'Carpeta no encontrada' },
        { status: 404 }
      )
    }

    const owner = await User.findById(binder.userId)
      .select('name phone')
      .lean<{ name?: string; phone?: string } | null>()

    const sellerName = (owner?.name ?? 'Jugador').trim() || 'Jugador'
    const sellerPhone = (owner?.phone ?? '').trim()
    const whatsappHref = buildWhatsAppHref(sellerPhone)

    const filter: Record<string, unknown> = {
      binderId: binder._id,
      published: true
    }
    if (q) {
      filter.name = {
        $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i'
      }
    }
    if (setFilter) filter.setCode = setFilter
    if (isCardSingleCondition(conditionRaw)) {
      filter.condition = conditionRaw
    }
    if (isCardSingleLanguage(languageRaw)) {
      filter.language = languageRaw
    }

    const [total, rows] = await Promise.all([
      CardSingle.countDocuments(filter),
      CardSingle.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ])

    let interestedIds = new Set<string>()
    const session = await auth()
    const meId = session?.user?.id
    if (meId && rows.length > 0) {
      const mine = await CardSingleInterest.find({
        userId: new mongoose.Types.ObjectId(meId),
        singleId: { $in: rows.map(r => r._id) }
      })
        .select('singleId')
        .lean()
      interestedIds = new Set(mine.map(m => String(m.singleId)))
    }

    const singles = rows.map(r => {
      const dto = toCardSingleDTO(
        r as unknown as Parameters<typeof toCardSingleDTO>[0]
      )
      return {
        ...dto,
        binderName: binder.name,
        sellerName,
        sellerPhone,
        whatsappHref,
        interestedByMe: interestedIds.has(dto.id)
      }
    })

    return NextResponse.json({
      binder: {
        id: binder._id.toString(),
        name: binder.name,
        slug: binder.slug,
        description: binder.description ?? ''
      },
      seller: {
        name: sellerName,
        phone: sellerPhone,
        whatsappHref
      },
      page,
      limit,
      total,
      singles
    })
  } catch (e) {
    console.error('GET /api/public/carpetas/[slug]:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los singles' },
      { status: 500 }
    )
  }
}
