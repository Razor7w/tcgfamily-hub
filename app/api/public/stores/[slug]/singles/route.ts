import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { isCardSingleCondition } from '@/lib/card-single-condition'
import { toCardSingleDTO } from '@/lib/card-single-dto'
import { buildWhatsAppHref } from '@/lib/card-single-whatsapp'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'
import CardSingle from '@/models/CardSingle'
import CardSingleInterest from '@/models/CardSingleInterest'
import Store from '@/models/Store'
import User from '@/models/User'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ slug: string }> }

const PAGE_MAX = 48

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') ?? '').trim().slice(0, 80)
    const setFilter = (searchParams.get('set') ?? '').trim().toUpperCase()
    const conditionRaw = searchParams.get('condition')
    const page = Math.max(1, Math.round(Number(searchParams.get('page') ?? 1)))
    const limit = Math.min(
      PAGE_MAX,
      Math.max(1, Math.round(Number(searchParams.get('limit') ?? 24)))
    )

    await connectDB()

    const storeLean = await Store.findOne({ slug, isActive: true })
      .select('_id name slug')
      .lean<{
        _id: mongoose.Types.ObjectId
        name?: string
        slug?: string
      } | null>()

    if (!storeLean) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    const filter: Record<string, unknown> = {
      storeId: storeLean._id,
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

    const [total, rows] = await Promise.all([
      CardSingle.countDocuments(filter),
      CardSingle.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ])

    const userIds = [...new Set(rows.map(r => String(r.userId)))]
    const binderIds = [...new Set(rows.map(r => String(r.binderId)))]

    const [users, binders] = await Promise.all([
      User.find({
        _id: {
          $in: userIds.map(id => new mongoose.Types.ObjectId(id))
        }
      })
        .select('name phone')
        .lean<
          { _id: mongoose.Types.ObjectId; name?: string; phone?: string }[]
        >(),
      CardBinder.find({
        _id: {
          $in: binderIds.map(id => new mongoose.Types.ObjectId(id))
        }
      })
        .select('name')
        .lean<{ _id: mongoose.Types.ObjectId; name?: string }[]>()
    ])

    const userMap = new Map(
      users.map(u => [
        u._id.toString(),
        {
          name: (u.name ?? 'Jugador').trim() || 'Jugador',
          phone: (u.phone ?? '').trim()
        }
      ])
    )
    const binderMap = new Map(
      binders.map(b => [b._id.toString(), (b.name ?? '').trim()])
    )

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
      const seller = userMap.get(dto.userId) ?? {
        name: 'Jugador',
        phone: ''
      }
      return {
        ...dto,
        binderName: binderMap.get(dto.binderId) ?? '',
        sellerName: seller.name,
        sellerPhone: seller.phone,
        whatsappHref: buildWhatsAppHref(seller.phone),
        interestedByMe: interestedIds.has(dto.id)
      }
    })

    return NextResponse.json({
      store: {
        id: storeLean._id.toString(),
        name: typeof storeLean.name === 'string' ? storeLean.name.trim() : slug,
        slug:
          typeof storeLean.slug === 'string'
            ? storeLean.slug.trim().toLowerCase()
            : slug
      },
      page,
      limit,
      total,
      singles
    })
  } catch (e) {
    console.error('GET /api/public/stores/[slug]/singles:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los singles' },
      { status: 500 }
    )
  }
}
