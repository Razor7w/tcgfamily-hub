import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { buildContributionLeaderboard } from '@/lib/contribution-points/build-contribution-leaderboard'
import { isContributionPointsEnabledForStore } from '@/lib/contribution-points/settings'

function normSlug(s: string) {
  return s.trim().toLowerCase()
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? normSlug(raw) : ''
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    const limitRaw = request.nextUrl.searchParams.get('limit')
    const limitParsed = limitRaw ? Number(limitRaw) : 10
    const limit = Number.isFinite(limitParsed) ? limitParsed : 10

    const periodRaw = request.nextUrl.searchParams.get('period')
    const period = periodRaw === 'all' ? 'all' : 'month'

    await connectDB()

    const storeLean = await Store.findOne({ slug, isActive: true })
      .select('_id name')
      .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>()

    if (!storeLean) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    const enabled = await isContributionPointsEnabledForStore(
      storeLean._id.toString()
    )
    if (!enabled) {
      return NextResponse.json({ enabled: false, rows: [] }, { status: 200 })
    }

    const leaderboard = await buildContributionLeaderboard({
      storeId: storeLean._id,
      limit,
      period
    })

    return NextResponse.json(
      {
        enabled: true,
        period: leaderboard.period,
        periodLabel: leaderboard.periodLabel,
        store: {
          name: typeof storeLean.name === 'string' ? storeLean.name.trim() : ''
        },
        rows: leaderboard.rows
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/stores/[slug]/contribution-leaderboard:', error)
    return NextResponse.json(
      { error: 'Error al cargar el ranking' },
      { status: 500 }
    )
  }
}
