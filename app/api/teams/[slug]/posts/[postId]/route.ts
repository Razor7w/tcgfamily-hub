import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import {
  canManageTeam,
  getApprovedTeamBySlug,
  getMembershipForUserOnTeam
} from '@/lib/teams/access'
import {
  TEAM_POST_TITLE_MAX,
  TEAM_POST_NOT_DELETED_FILTER
} from '@/lib/teams/post-constants'
import type { TeamPostVisibility } from '@/lib/teams/post-constants'
import { resolveTeamPostCoverAsset } from '@/lib/teams/post-media'
import { buildTeamPostDTOs } from '@/lib/teams/post-payload'
import { teamPostBodyIsEmpty } from '@/lib/teams/post-text'
import { deleteTeamPostCoverIfOwned } from '@/lib/teams/r2-cleanup'
import SavedDecklist from '@/models/SavedDecklist'
import TeamPost from '@/models/TeamPost'

type PostLean = {
  _id: mongoose.Types.ObjectId
  authorUserId: mongoose.Types.ObjectId
  coverKey?: string
  title?: string
  bodyHtml?: string
  coverUrl?: string
  visibility?: TeamPostVisibility
  decklistId?: mongoose.Types.ObjectId
  likeCount?: number
  dislikeCount?: number
  commentCount?: number
  createdAt?: Date
  updatedAt?: Date
}

async function getPostForDelete(slug: string, postId: string, userId: string) {
  const team = await getApprovedTeamBySlug(slug)
  if (!team)
    return { error: 'Equipo no encontrado' as const, status: 404 as const }
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return { error: 'Publicaci?n inv?lida' as const, status: 400 as const }
  }

  await connectDB()
  const post = await TeamPost.findOne({
    _id: new mongoose.Types.ObjectId(postId),
    teamId: team._id,
    ...TEAM_POST_NOT_DELETED_FILTER
  }).lean<PostLean | null>()

  if (!post) {
    return { error: 'Publicaci?n no encontrada' as const, status: 404 as const }
  }

  const membership = await getMembershipForUserOnTeam(
    userId,
    team._id as mongoose.Types.ObjectId
  )
  const isAuthor = String(post.authorUserId) === userId
  const canManage = membership ? canManageTeam(membership.role) : false

  if (!isAuthor && !canManage) {
    return { error: 'No autorizado' as const, status: 403 as const }
  }

  return { post, team }
}

async function getPostForEdit(slug: string, postId: string, userId: string) {
  const team = await getApprovedTeamBySlug(slug)
  if (!team)
    return { error: 'Equipo no encontrado' as const, status: 404 as const }
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return { error: 'Publicaci?n inv?lida' as const, status: 400 as const }
  }

  await connectDB()
  const post = await TeamPost.findOne({
    _id: new mongoose.Types.ObjectId(postId),
    teamId: team._id,
    ...TEAM_POST_NOT_DELETED_FILTER
  }).lean<PostLean | null>()

  if (!post) {
    return { error: 'Publicaci?n no encontrada' as const, status: 404 as const }
  }

  if (String(post.authorUserId) !== userId) {
    return { error: 'No autorizado' as const, status: 403 as const }
  }

  return { post, team }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; postId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: rawSlug, postId: rawPostId } = await context.params
    const slug = typeof rawSlug === 'string' ? rawSlug.trim().toLowerCase() : ''
    const postId = typeof rawPostId === 'string' ? rawPostId.trim() : ''

    const result = await getPostForEdit(slug, postId, gate.session.user!.id!)
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    const body = await request.json().catch(() => null)
    const titleRaw = typeof body?.title === 'string' ? body.title.trim() : ''
    const title = titleRaw.slice(0, TEAM_POST_TITLE_MAX)
    const bodyHtmlRaw = typeof body?.bodyHtml === 'string' ? body.bodyHtml : ''
    const { sanitizeTeamPostHtml } = await import('@/lib/teams/post-sanitize')
    const bodyHtml = sanitizeTeamPostHtml(bodyHtmlRaw)

    if (teamPostBodyIsEmpty(bodyHtml)) {
      return NextResponse.json(
        { error: 'Escribe el contenido de la publicaci?n' },
        { status: 400 }
      )
    }

    const teamIdStr = String(result.team._id)
    const teamOid = result.team._id as mongoose.Types.ObjectId
    const oldCoverKey =
      typeof result.post.coverKey === 'string'
        ? result.post.coverKey.trim()
        : ''

    const coverUrlRaw =
      typeof body?.coverUrl === 'string' ? body.coverUrl.trim() : undefined
    const coverKeyRaw =
      typeof body?.coverKey === 'string' ? body.coverKey.trim() : undefined

    let coverUrl = result.post.coverUrl ?? ''
    let coverKey = oldCoverKey

    if (coverUrlRaw !== undefined) {
      if (!coverUrlRaw) {
        if (oldCoverKey) {
          await deleteTeamPostCoverIfOwned(teamIdStr, oldCoverKey)
        }
        coverUrl = ''
        coverKey = ''
      } else {
        const resolved = resolveTeamPostCoverAsset(
          teamIdStr,
          coverUrlRaw,
          coverKeyRaw ?? ''
        )
        if (!resolved) {
          return NextResponse.json(
            { error: 'Portada inv?lida' },
            { status: 400 }
          )
        }
        if (oldCoverKey && oldCoverKey !== resolved.key) {
          await deleteTeamPostCoverIfOwned(teamIdStr, oldCoverKey)
        }
        coverUrl = resolved.url
        coverKey = resolved.key
      }
    }

    const visibilityRaw = body?.visibility
    let visibility: TeamPostVisibility = result.post.visibility ?? 'public'
    if (visibilityRaw === 'members_only' || visibilityRaw === 'members') {
      visibility = 'members_only'
    } else if (visibilityRaw === 'public') {
      visibility = 'public'
    } else if (visibilityRaw != null && visibilityRaw !== '') {
      return NextResponse.json(
        { error: 'Visibilidad inv?lida' },
        { status: 400 }
      )
    }

    let decklistId: mongoose.Types.ObjectId | undefined | null = undefined
    if (body?.decklistId === null || body?.decklistId === '') {
      decklistId = null
    } else if (typeof body?.decklistId === 'string' && body.decklistId.trim()) {
      const decklistIdRaw = body.decklistId.trim()
      if (!mongoose.Types.ObjectId.isValid(decklistIdRaw)) {
        return NextResponse.json({ error: 'Mazo inv?lido' }, { status: 400 })
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
              'El mazo no existe, no es tuyo o no est? marcado como p?blico'
          },
          { status: 400 }
        )
      }
      decklistId = deck._id
    }

    const updates: Record<string, unknown> = {
      title,
      bodyHtml,
      coverUrl,
      coverKey,
      visibility
    }
    if (decklistId !== undefined) {
      updates.decklistId = decklistId === null ? undefined : decklistId
    }

    await TeamPost.updateOne({ _id: result.post._id }, { $set: updates })

    const updated = await TeamPost.findById(
      result.post._id
    ).lean<PostLean | null>()
    if (!updated) {
      return NextResponse.json(
        { error: 'Publicaci?n no encontrada' },
        { status: 404 }
      )
    }

    const [post] = await buildTeamPostDTOs(
      [
        {
          _id: updated._id,
          teamId: teamOid,
          authorUserId: updated.authorUserId,
          title: updated.title ?? '',
          bodyHtml: updated.bodyHtml ?? '',
          coverUrl: updated.coverUrl ?? '',
          coverKey: updated.coverKey,
          visibility: updated.visibility,
          decklistId: updated.decklistId,
          likeCount: updated.likeCount ?? 0,
          dislikeCount: updated.dislikeCount ?? 0,
          commentCount: updated.commentCount ?? 0,
          createdAt: updated.createdAt ?? new Date(),
          updatedAt: updated.updatedAt ?? new Date()
        }
      ],
      gate.session.user!.id!,
      false
    )

    return NextResponse.json({ post })
  } catch (e) {
    console.error('PATCH /api/teams/[slug]/posts/[postId]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; postId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: rawSlug, postId: rawPostId } = await context.params
    const slug = typeof rawSlug === 'string' ? rawSlug.trim().toLowerCase() : ''
    const postId = typeof rawPostId === 'string' ? rawPostId.trim() : ''

    const result = await getPostForDelete(slug, postId, gate.session.user!.id!)
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    const teamIdStr = String(result.team._id)
    await deleteTeamPostCoverIfOwned(teamIdStr, result.post.coverKey)

    await TeamPost.updateOne(
      { _id: result.post._id },
      { $set: { deletedAt: new Date() } }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/teams/[slug]/posts/[postId]:', e)
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 })
  }
}
