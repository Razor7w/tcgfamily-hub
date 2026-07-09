import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  canManageTeam,
  getApprovedTeamBySlug,
  getMembershipForUserOnTeam
} from '@/lib/teams/access'
import { TEAM_POST_TITLE_MAX } from '@/lib/teams/post-constants'
import type { TeamPostVisibility } from '@/lib/teams/post-constants'
import { resolveTeamPostCoverAsset } from '@/lib/teams/post-media'
import { buildTeamPostDTOs, listTeamPosts } from '@/lib/teams/post-payload'
import {
  sanitizeTeamPostHtml,
  teamPostBodyIsEmpty
} from '@/lib/teams/post-sanitize'
import SavedDecklist from '@/models/SavedDecklist'
import TeamPost from '@/models/TeamPost'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const cursor = request.nextUrl.searchParams.get('cursor')
    const scopeRaw = request.nextUrl.searchParams.get('scope')
    const scope: 'public' | 'members' =
      scopeRaw === 'members' ? 'members' : 'public'

    const session = await auth()
    const viewerUserId = session?.user?.id ?? null
    let viewerCanManage = false
    let viewerIsMember = false
    if (viewerUserId) {
      const membership = await getMembershipForUserOnTeam(
        viewerUserId,
        team._id as mongoose.Types.ObjectId
      )
      viewerIsMember = membership != null
      viewerCanManage = membership ? canManageTeam(membership.role) : false
    }

    if (scope === 'members' && !viewerIsMember) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const result = await listTeamPosts(team._id as mongoose.Types.ObjectId, {
      cursor,
      viewerUserId,
      viewerCanManage,
      scope,
      viewerIsMember
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control':
          scope === 'public'
            ? 'public, max-age=0, must-revalidate'
            : 'private, no-cache'
      }
    })
  } catch (e) {
    console.error('GET /api/teams/[slug]/posts:', e)
    return NextResponse.json(
      { error: 'Error al cargar publicaciones' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const teamOid = team._id as mongoose.Types.ObjectId
    const membership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      teamOid
    )
    if (!membership) {
      return NextResponse.json(
        { error: 'Solo miembros del equipo pueden publicar' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const titleRaw = typeof body?.title === 'string' ? body.title.trim() : ''
    const title = titleRaw.slice(0, TEAM_POST_TITLE_MAX)
    const bodyHtmlRaw = typeof body?.bodyHtml === 'string' ? body.bodyHtml : ''
    const bodyHtml = sanitizeTeamPostHtml(bodyHtmlRaw)

    if (teamPostBodyIsEmpty(bodyHtml)) {
      return NextResponse.json(
        { error: 'Escribe el contenido de la publicación' },
        { status: 400 }
      )
    }

    const coverUrlRaw = typeof body?.coverUrl === 'string' ? body.coverUrl : ''
    const coverKeyRaw = typeof body?.coverKey === 'string' ? body.coverKey : ''
    let coverUrl = ''
    let coverKey = ''
    if (coverUrlRaw) {
      const resolved = resolveTeamPostCoverAsset(
        String(teamOid),
        coverUrlRaw,
        coverKeyRaw
      )
      if (!resolved) {
        return NextResponse.json({ error: 'Portada inválida' }, { status: 400 })
      }
      coverUrl = resolved.url
      coverKey = resolved.key
    }

    await connectDB()

    let decklistId: mongoose.Types.ObjectId | undefined
    const decklistIdRaw =
      typeof body?.decklistId === 'string' ? body.decklistId.trim() : ''
    if (decklistIdRaw) {
      if (!mongoose.Types.ObjectId.isValid(decklistIdRaw)) {
        return NextResponse.json({ error: 'Mazo inválido' }, { status: 400 })
      }
      const deck = await SavedDecklist.findOne({
        _id: new mongoose.Types.ObjectId(decklistIdRaw),
        userId: new mongoose.Types.ObjectId(gate.session.user!.id!),
        isPublic: true
      })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>()
      if (!deck) {
        return NextResponse.json(
          {
            error:
              'El mazo no existe, no es tuyo o no está marcado como público'
          },
          { status: 400 }
        )
      }
      decklistId = deck._id
    }

    const visibilityRaw = body?.visibility
    let visibility: TeamPostVisibility = 'public'
    if (visibilityRaw === 'members_only' || visibilityRaw === 'members') {
      visibility = 'members_only'
    } else if (visibilityRaw === 'public') {
      visibility = 'public'
    } else if (visibilityRaw != null && visibilityRaw !== '') {
      return NextResponse.json(
        { error: 'Visibilidad inválida' },
        { status: 400 }
      )
    }

    const post = await TeamPost.create({
      teamId: teamOid,
      authorUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
      title,
      bodyHtml,
      coverUrl,
      coverKey,
      decklistId,
      visibility
    })

    const [created] = await buildTeamPostDTOs(
      [
        {
          _id: post._id as mongoose.Types.ObjectId,
          teamId: teamOid,
          authorUserId: post.authorUserId as mongoose.Types.ObjectId,
          title: post.title,
          bodyHtml: post.bodyHtml,
          coverUrl: post.coverUrl,
          visibility: post.visibility,
          decklistId: post.decklistId as mongoose.Types.ObjectId | undefined,
          likeCount: 0,
          dislikeCount: 0,
          commentCount: 0,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        }
      ],
      gate.session.user!.id!,
      canManageTeam(membership.role)
    )

    return NextResponse.json({ post: created }, { status: 201 })
  } catch (e) {
    console.error('POST /api/teams/[slug]/posts:', e)
    return NextResponse.json(
      { error: 'No se pudo crear la publicación' },
      { status: 500 }
    )
  }
}
