import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { TEAM_BIO_MAX, TEAM_NAME_MAX } from '@/lib/teams/constants'
import {
  canManageTeam,
  getApprovedTeamBySlug,
  getMembershipForUserOnTeam,
  isCaptain
} from '@/lib/teams/access'
import { getCachedTeamPublicCore } from '@/lib/teams/public-cache'
import { isValidTeamSlug } from '@/lib/teams/slug'
import { resolveTeamBrandingAsset } from '@/lib/teams/branding'
import {
  deleteAllTeamR2Media,
  deleteR2ObjectBestEffort
} from '@/lib/teams/r2-cleanup'
import Team from '@/models/Team'
import TeamInvitation from '@/models/TeamInvitation'
import TeamMembership from '@/models/TeamMembership'

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

    const payload = await getCachedTeamPublicCore(
      team._id as mongoose.Types.ObjectId
    )
    if (!payload) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { team: payload },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
        }
      }
    )
  } catch (e) {
    console.error('GET /api/teams/[slug]:', e)
    return NextResponse.json(
      { error: 'Error al cargar el equipo' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    if (!membership || !canManageTeam(membership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const updates: Record<string, unknown> = {}
    const teamId = teamOid.toString()

    const touchesBranding =
      typeof body?.logoUrl === 'string' || typeof body?.coverUrl === 'string'

    if (touchesBranding && !isCaptain(membership.role)) {
      return NextResponse.json(
        { error: 'Solo el capitán puede cambiar logo o portada' },
        { status: 403 }
      )
    }

    if (typeof body?.name === 'string') {
      const name = body.name.trim().slice(0, TEAM_NAME_MAX)
      if (name.length < 2) {
        return NextResponse.json(
          { error: 'Nombre demasiado corto' },
          { status: 400 }
        )
      }
      updates.name = name
    }

    if (typeof body?.bio === 'string') {
      updates.bio = body.bio.trim().slice(0, TEAM_BIO_MAX)
    }

    if (typeof body?.logoUrl === 'string') {
      const resolved = resolveTeamBrandingAsset(
        teamId,
        body.logoUrl,
        typeof body?.logoKey === 'string' ? body.logoKey : ''
      )
      if (!resolved) {
        return NextResponse.json({ error: 'Logo inválido' }, { status: 400 })
      }
      updates.logoUrl = resolved.url
      updates.logoKey = resolved.key
    }

    if (typeof body?.coverUrl === 'string') {
      const resolved = resolveTeamBrandingAsset(
        teamId,
        body.coverUrl,
        typeof body?.coverKey === 'string' ? body.coverKey : ''
      )
      if (!resolved) {
        return NextResponse.json({ error: 'Portada inválida' }, { status: 400 })
      }
      updates.coverUrl = resolved.url
      updates.coverKey = resolved.key
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
    }

    await connectDB()

    if (
      updates.logoKey === '' &&
      typeof team.logoKey === 'string' &&
      team.logoKey.trim()
    ) {
      await deleteR2ObjectBestEffort(team.logoKey.trim())
    }

    if (
      updates.coverKey === '' &&
      typeof team.coverKey === 'string' &&
      team.coverKey.trim()
    ) {
      await deleteR2ObjectBestEffort(team.coverKey.trim())
    }

    await Team.updateOne({ _id: teamOid }, { $set: updates })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PATCH /api/teams/[slug]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el equipo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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
    if (!membership || !isCaptain(membership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await connectDB()

    await deleteAllTeamR2Media(teamOid, {
      logoKey: team.logoKey,
      coverKey: team.coverKey
    })

    await Team.updateOne(
      { _id: teamOid },
      {
        $set: {
          isActive: false,
          reviewedAt: new Date()
        }
      }
    )
    await TeamMembership.updateMany(
      { teamId: teamOid, status: 'active' },
      { $set: { status: 'left' } }
    )
    await TeamInvitation.updateMany(
      { teamId: teamOid, status: 'pending' },
      { $set: { status: 'cancelled' } }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/teams/[slug]:', e)
    return NextResponse.json(
      { error: 'No se pudo disolver el equipo' },
      { status: 500 }
    )
  }
}
