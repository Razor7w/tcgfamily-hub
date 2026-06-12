import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import mongoose from 'mongoose'
import League from '@/models/League'
import Store from '@/models/Store'
import { publicStoreSlugFromHeaders } from '@/lib/multitenancy/ingress-headers'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import { DEFAULT_PRIMARY_STORE_SLUG } from '@/lib/multitenancy/constants'
import { getOrBuildLeaguePublicCache } from '@/lib/league-public-cache'

/**
 * Clasificación pública de una liga (torneos cerrados; puntos por récord W/L/T del participante).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    if (!slug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const qpStore = searchParams.get('storeSlug')
    let storeSlugHint =
      typeof qpStore === 'string' && qpStore.trim()
        ? qpStore.trim().toLowerCase()
        : ''
    if (!storeSlugHint) {
      const hSlug = publicStoreSlugFromHeaders(request.headers)
      if (hSlug) storeSlugHint = hSlug.trim().toLowerCase()
    }
    if (!storeSlugHint) {
      storeSlugHint = DEFAULT_PRIMARY_STORE_SLUG
    }

    const storeLean = await Store.findOne({
      slug: storeSlugHint
    })
      .select('_id')
      .lean<{ _id: mongoose.Types.ObjectId } | null>()
    if (!storeLean) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }
    const hintedStoreOid = storeLean._id
    const prim = await Store.findOne({ slug: DEFAULT_PRIMARY_STORE_SLUG })
      .select('_id')
      .lean<{ _id: mongoose.Types.ObjectId } | null>()
    const leagueScope = mongoFilterByStore(
      hintedStoreOid,
      prim?._id ?? null
    ) as Record<string, unknown>

    let leagueDoc = await League.findOne({
      slug,
      isActive: true,
      ...leagueScope
    }).lean()

    /**
     * En localhost el header suele anclar la tienda primaria (tcgfamily), pero la liga
     * puede existir sólo en otra tienda (ej. tier0). Si no hay match, resolvemos por
     * slug global y usamos el `storeId` del documento de liga para filtrar eventos.
     */
    if (!leagueDoc) {
      const sameSlug = await League.find({ slug, isActive: true }).lean()
      if (sameSlug.length === 1) {
        leagueDoc = sameSlug[0]!
      } else if (sameSlug.length > 1) {
        return NextResponse.json(
          {
            error:
              'Hay varias ligas con este slug en distintas tiendas; indica la tienda con ?storeSlug=',
            code: 'ambiguous_league_slug'
          },
          { status: 400 }
        )
      }
    }

    if (!leagueDoc) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const sidRaw = leagueDoc.storeId
    const effectiveStoreOid =
      sidRaw != null
        ? new mongoose.Types.ObjectId(sidRaw as mongoose.Types.ObjectId)
        : (prim?._id ?? hintedStoreOid)

    const league = {
      _id: String(leagueDoc._id),
      name: leagueDoc.name,
      slug: leagueDoc.slug,
      description: leagueDoc.description ?? '',
      countBestEvents:
        leagueDoc.countBestEvents === null ||
        leagueDoc.countBestEvents === undefined
          ? null
          : typeof leagueDoc.countBestEvents === 'number'
            ? Math.round(leagueDoc.countBestEvents)
            : null
    }

    const storeLeanPub = await Store.findById(effectiveStoreOid)
      .select('name slug logoUrl')
      .lean<{ name: string; slug: string; logoUrl?: string } | null>()
    const storePub = storeLeanPub
      ? {
          name:
            typeof storeLeanPub.name === 'string'
              ? storeLeanPub.name.trim()
              : '',
          slug:
            typeof storeLeanPub.slug === 'string'
              ? storeLeanPub.slug.trim()
              : '',
          logoUrl:
            typeof storeLeanPub.logoUrl === 'string'
              ? storeLeanPub.logoUrl.trim()
              : ''
        }
      : null

    const cached = await getOrBuildLeaguePublicCache(String(leagueDoc._id))
    const standings = cached?.standings ?? []
    const tournamentSummaries = cached?.tournaments ?? []
    const chartTop = cached?.chartTop ?? []

    return NextResponse.json(
      {
        league,
        store: storePub,
        tournaments: tournamentSummaries,
        standings,
        chartTop
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (error) {
    console.error('GET /api/leagues/[slug]:', error)
    return NextResponse.json(
      { error: 'Error al cargar la liga' },
      { status: 500 }
    )
  }
}
