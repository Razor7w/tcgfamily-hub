import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import type { TeamRole } from '@/lib/teams/constants'
import {
  canManageTeam,
  getMembershipForUserOnTeam,
  getApprovedTeamBySlug,
  isCaptain
} from '@/lib/teams/access'
import TeamMembership from '@/models/TeamMembership'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw, userId: targetUserId } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const teamOid = team._id as mongoose.Types.ObjectId
    const actorMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      teamOid
    )
    if (!actorMembership || !isCaptain(actorMembership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const role =
      body?.role === 'co_captain' || body?.role === 'member'
        ? (body.role as TeamRole)
        : null
    if (!role) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    if (targetUserId === gate.session.user!.id) {
      return NextResponse.json(
        { error: 'No puedes cambiar tu propio rol de capitán aquí' },
        { status: 400 }
      )
    }

    await connectDB()
    const targetOid = new mongoose.Types.ObjectId(targetUserId)
    const targetMembership = await TeamMembership.findOne({
      teamId: teamOid,
      userId: targetOid,
      status: 'active'
    }).lean<{ role: TeamRole } | null>()

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Miembro no encontrado' },
        { status: 404 }
      )
    }

    if (targetMembership.role === 'captain') {
      return NextResponse.json(
        { error: 'No puedes degradar al capitán' },
        { status: 400 }
      )
    }

    await TeamMembership.updateOne(
      { teamId: teamOid, userId: targetOid, status: 'active' },
      { $set: { role } }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PATCH /api/teams/[slug]/members/[userId]:', e)
    return NextResponse.json(
      { error: 'No se pudo actualizar el miembro' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const gate = await requireSessionUser()
    if (!gate.ok) return gate.response

    const { slug: raw, userId: targetUserId } = await context.params
    const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    const team = await getApprovedTeamBySlug(slug)
    if (!team) {
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    const teamOid = team._id as mongoose.Types.ObjectId
    const actorId = gate.session.user!.id!
    const actorMembership = await getMembershipForUserOnTeam(actorId, teamOid)
    if (!actorMembership) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
    }

    const isSelf = targetUserId === actorId
    if (!isSelf && !canManageTeam(actorMembership.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await connectDB()
    const targetOid = new mongoose.Types.ObjectId(targetUserId)
    const targetMembership = await TeamMembership.findOne({
      teamId: teamOid,
      userId: targetOid,
      status: 'active'
    }).lean<{ role: TeamRole } | null>()

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Miembro no encontrado' },
        { status: 404 }
      )
    }

    if (targetMembership.role === 'captain') {
      return NextResponse.json(
        {
          error: isSelf
            ? 'El capitán debe transferir el mando o disolver el equipo'
            : 'No puedes expulsar al capitán'
        },
        { status: 400 }
      )
    }

    if (
      !isSelf &&
      targetMembership.role === 'co_captain' &&
      !isCaptain(actorMembership.role)
    ) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await TeamMembership.updateOne(
      { teamId: teamOid, userId: targetOid, status: 'active' },
      { $set: { status: 'left' } }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/teams/[slug]/members/[userId]:', e)
    return NextResponse.json(
      { error: 'No se pudo quitar al miembro' },
      { status: 500 }
    )
  }
}
