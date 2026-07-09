import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getApprovedTeamBySlug } from '@/lib/teams/access'
import { buildTeamPublicFriendlyMatchDetail } from '@/lib/teams/friendly-match/build-payload'
import { isValidTeamSlug } from '@/lib/teams/slug'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45'
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; matchId: string }> }
) {
  try {
    const { slug: rawSlug, matchId: rawMatchId } = await context.params
    const slug = typeof rawSlug === 'string' ? rawSlug.trim().toLowerCase() : ''
    const matchId = typeof rawMatchId === 'string' ? rawMatchId.trim() : ''

    if (!isValidTeamSlug(slug)) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return NextResponse.json({ error: 'Match inválido' }, { status: 400 })
    }

    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const match = await buildTeamPublicFriendlyMatchDetail(
      new mongoose.Types.ObjectId(matchId),
      team._id as mongoose.Types.ObjectId
    )
    if (!match) {
      return NextResponse.json(
        { error: 'Versus no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ match }, { status: 200, headers: CACHE_HEADERS })
  } catch (e) {
    console.error('GET /api/teams/[slug]/friendly-matches/[matchId]:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar el versus' },
      { status: 500 }
    )
  }
}
