import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getApprovedTeamBySlug } from '@/lib/teams/access'
import { getCachedTeamLeagueMedals } from '@/lib/teams/public-cache'
import { isValidTeamSlug } from '@/lib/teams/slug'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    if (!isValidTeamSlug(slug)) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const medals = await getCachedTeamLeagueMedals(
      team._id as mongoose.Types.ObjectId
    )

    return NextResponse.json(
      { medals },
      { status: 200, headers: CACHE_HEADERS }
    )
  } catch (e) {
    console.error('GET /api/teams/[slug]/medals/league:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las medallas de liga' },
      { status: 500 }
    )
  }
}
