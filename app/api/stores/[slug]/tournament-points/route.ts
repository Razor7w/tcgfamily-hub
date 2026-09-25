import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { buildPublicStoreTournamentPointsLeaderboard } from '@/lib/build-public-tournament-points-leaderboard'
import { getTournamentPointsPublicConfig } from '@/lib/tournament-points-settings'

export const runtime = 'nodejs'

function normSlug(s: string) {
  return s.trim().toLowerCase()
}

/**
 * GET /api/stores/[slug]/tournament-points — ranking público (sin sesión).
 * Solo si la tienda está activa y tiene «Puntos torneo» habilitado.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? normSlug(raw) : ''
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

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

    const config = await getTournamentPointsPublicConfig(
      storeLean._id.toString()
    )
    if (!config.enabled) {
      return NextResponse.json(
        {
          error:
            'Esta tienda no tiene activo el módulo de puntos por torneo (reparto y gestión).',
          enabled: false
        },
        { status: 404 }
      )
    }

    const rows = await buildPublicStoreTournamentPointsLeaderboard(
      storeLean._id
    )

    return NextResponse.json(
      {
        enabled: true,
        label: config.label,
        store: {
          id: storeLean._id.toString(),
          name:
            typeof storeLean.name === 'string' ? storeLean.name.trim() : slug,
          slug:
            typeof storeLean.slug === 'string'
              ? storeLean.slug.trim().toLowerCase()
              : slug
        },
        playerCount: rows.length,
        rows
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/stores/[slug]/tournament-points:', error)
    return NextResponse.json(
      { error: 'Error al cargar el ranking de puntos' },
      { status: 500 }
    )
  }
}
