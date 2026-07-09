import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import { getApprovedTeamBySlug } from '@/lib/teams/access'
import {
  getTeamPostForInteraction,
  userCanViewTeamPost
} from '@/lib/teams/post-access'
import { applyTeamPostReaction } from '@/lib/teams/post-payload'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string; postId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: rawSlug, postId: rawPostId } = await context.params
    const slug = typeof rawSlug === 'string' ? rawSlug.trim().toLowerCase() : ''
    const postId = typeof rawPostId === 'string' ? rawPostId.trim() : ''

    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: 'Publicación inválida' },
        { status: 400 }
      )
    }

    const post = await getTeamPostForInteraction(
      team._id as mongoose.Types.ObjectId,
      postId
    )
    if (!post) {
      return NextResponse.json(
        { error: 'Publicación no encontrada' },
        { status: 404 }
      )
    }

    const canView = await userCanViewTeamPost(post, gate.session.user!.id!)
    if (!canView) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const postOid = post._id

    const body = await request.json().catch(() => null)
    const valueRaw = body?.value
    let value: 1 | -1 | null = null
    if (valueRaw === 1 || valueRaw === 'like') value = 1
    else if (valueRaw === -1 || valueRaw === 'dislike') value = -1
    else if (valueRaw !== null && valueRaw !== undefined) {
      return NextResponse.json({ error: 'Reacción inválida' }, { status: 400 })
    }

    const result = await applyTeamPostReaction(
      postOid,
      new mongoose.Types.ObjectId(gate.session.user!.id!),
      value
    )

    return NextResponse.json(result)
  } catch (e) {
    console.error('PUT reaction:', e)
    return NextResponse.json(
      { error: 'No se pudo guardar la reacción' },
      { status: 500 }
    )
  }
}
