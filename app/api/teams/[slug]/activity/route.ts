import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getApprovedTeamBySlug } from '@/lib/teams/access'
import { getCachedTeamPublicActivity } from '@/lib/teams/public-cache'
import { isValidTeamSlug } from '@/lib/teams/slug'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=180'
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

    const activity = await getCachedTeamPublicActivity(
      team._id as mongoose.Types.ObjectId
    )
    if (!activity) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { activity },
      { status: 200, headers: CACHE_HEADERS }
    )
  } catch (e) {
    console.error('GET /api/teams/[slug]/activity:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar la actividad del equipo' },
      { status: 500 }
    )
  }
}
