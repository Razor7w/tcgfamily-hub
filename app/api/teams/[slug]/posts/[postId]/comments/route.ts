import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { getApprovedTeamBySlug } from '@/lib/teams/access'
import {
  getTeamPostForInteraction,
  userCanViewTeamPost
} from '@/lib/teams/post-access'
import { TEAM_POST_COMMENT_MAX } from '@/lib/teams/post-constants'
import {
  buildTeamPostCommentDTOs,
  listTeamPostComments
} from '@/lib/teams/post-payload'
import TeamPost from '@/models/TeamPost'
import TeamPostComment from '@/models/TeamPostComment'

async function resolvePostAccess(teamSlug: string, postId: string) {
  const team = await getApprovedTeamBySlug(teamSlug)
  if (!team) return null
  const post = await getTeamPostForInteraction(
    team._id as mongoose.Types.ObjectId,
    postId
  )
  if (!post) return null
  return { team, post }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; postId: string }> }
) {
  try {
    const { slug: rawSlug, postId: rawPostId } = await context.params
    const slug = typeof rawSlug === 'string' ? rawSlug.trim().toLowerCase() : ''
    const postId = typeof rawPostId === 'string' ? rawPostId.trim() : ''

    const found = await resolvePostAccess(slug, postId)
    if (!found) {
      return NextResponse.json(
        { error: 'Publicación no encontrada' },
        { status: 404 }
      )
    }

    const session = await auth()
    const canView = await userCanViewTeamPost(found.post, session?.user?.id)
    if (!canView) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const comments = await listTeamPostComments(found.post._id)
    return NextResponse.json({ comments })
  } catch (e) {
    console.error('GET comments:', e)
    return NextResponse.json(
      { error: 'Error al cargar comentarios' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; postId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: rawSlug, postId: rawPostId } = await context.params
    const slug = typeof rawSlug === 'string' ? rawSlug.trim().toLowerCase() : ''
    const postId = typeof rawPostId === 'string' ? rawPostId.trim() : ''

    const found = await resolvePostAccess(slug, postId)
    if (!found) {
      return NextResponse.json(
        { error: 'Publicación no encontrada' },
        { status: 404 }
      )
    }

    const canView = await userCanViewTeamPost(
      found.post,
      gate.session.user!.id!
    )
    if (!canView) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const text = typeof body?.body === 'string' ? body.body.trim() : ''
    if (!text) {
      return NextResponse.json(
        { error: 'Escribe un comentario' },
        { status: 400 }
      )
    }
    if (text.length > TEAM_POST_COMMENT_MAX) {
      return NextResponse.json(
        { error: `Máximo ${TEAM_POST_COMMENT_MAX} caracteres` },
        { status: 400 }
      )
    }

    await connectDB()
    const comment = await TeamPostComment.create({
      postId: found.post._id,
      authorUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
      body: text
    })
    await TeamPost.updateOne(
      { _id: found.post._id },
      { $inc: { commentCount: 1 } }
    )

    const [dto] = await buildTeamPostCommentDTOs([
      {
        _id: comment._id as mongoose.Types.ObjectId,
        authorUserId: comment.authorUserId as mongoose.Types.ObjectId,
        body: comment.body,
        createdAt: comment.createdAt
      }
    ])

    return NextResponse.json({ comment: dto }, { status: 201 })
  } catch (e) {
    console.error('POST comment:', e)
    return NextResponse.json({ error: 'No se pudo comentar' }, { status: 500 })
  }
}
