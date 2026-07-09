import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getApprovedTeamBySlug } from '@/lib/teams/access'
import { buildTeamPublicActiveFriendlyMatches } from '@/lib/teams/friendly-match/build-payload'
import { isValidTeamSlug } from '@/lib/teams/slug'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60'
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

    const matches = await buildTeamPublicActiveFriendlyMatches(
      team._id as mongoose.Types.ObjectId
    )

    return NextResponse.json(
      { matches },
      { status: 200, headers: CACHE_HEADERS }
    )
  } catch (e) {
    console.error('GET /api/teams/[slug]/friendly-matches/active:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar los versus activos' },
      { status: 500 }
    )
  }
}
