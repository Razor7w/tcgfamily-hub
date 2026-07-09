import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { TEAM_ROLE_LABELS } from '@/lib/teams/constants'
import {
  canManageTeam,
  getMembershipForUserOnTeam,
  getApprovedTeamBySlug,
  isCaptain
} from '@/lib/teams/access'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import { formatRutOnBlur } from '@/lib/rut-input'
import TeamInvitation from '@/models/TeamInvitation'
import TeamMembership from '@/models/TeamMembership'
import User from '@/models/User'

export async function GET(
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
    const viewerMembership = await getMembershipForUserOnTeam(
      gate.session.user!.id!,
      teamOid
    )
    if (!viewerMembership) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await connectDB()
    const memberships = await TeamMembership.find({
      teamId: teamOid,
      status: 'active'
    })
      .sort({ role: 1, createdAt: 1 })
      .lean()

    const userIds = memberships.map(m => m.userId)
    const users =
      userIds.length > 0
        ? await User.find({ _id: { $in: userIds } })
            .select('name email image')
            .lean<
              {
                _id: mongoose.Types.ObjectId
                name?: string
                email?: string
                image?: string
              }[]
            >()
        : []

    const userById = new Map(users.map(u => [String(u._id), u]))

    const members = memberships.map(m => {
      const uid = m.userId.toString()
      const u = userById.get(uid)
      const { displayName, imageUrl } = ownerPublicDisplay(u ?? null)
      return {
        userId: uid,
        displayName,
        imageUrl,
        role: m.role,
        roleLabel: TEAM_ROLE_LABELS[m.role]
      }
    })

    let invitations: {
      id: string
      inviteeUserId: string | null
      inviteeName: string
      inviteeImage: string | null
      inviteePopid: string
      inviteeRut: string
      linkStatus: 'linked' | 'awaiting_user'
      expiresAt: string
      createdAt: string
    }[] = []

    if (canManageTeam(viewerMembership.role)) {
      const rows = await TeamInvitation.find({
        teamId: teamOid,
        status: { $in: ['pending', 'awaiting_user'] },
        expiresAt: { $gt: new Date() }
      })
        .sort({ createdAt: -1 })
        .lean()

      const inviteeIds = rows
        .map(r => r.inviteeUserId)
        .filter((id): id is mongoose.Types.ObjectId => id != null)
        .map(id => new mongoose.Types.ObjectId(String(id)))

      const invitees =
        inviteeIds.length > 0
          ? await User.find({ _id: { $in: inviteeIds } })
              .select('name email image popid rut')
              .lean<
                {
                  _id: mongoose.Types.ObjectId
                  name?: string
                  email?: string
                  image?: string
                  popid?: string
                  rut?: string
                }[]
              >()
          : []
      const inviteeById = new Map(
        invitees.map(u => {
          const { displayName, imageUrl } = ownerPublicDisplay(u)
          return [
            String(u._id),
            {
              displayName,
              imageUrl,
              popid: typeof u.popid === 'string' ? u.popid.trim() : '',
              rut: typeof u.rut === 'string' ? u.rut.trim() : ''
            }
          ]
        })
      )

      invitations = rows.map(r => {
        const uid = r.inviteeUserId ? String(r.inviteeUserId) : ''
        const u = uid ? inviteeById.get(uid) : undefined
        const storedRut =
          typeof r.inviteeRut === 'string' && r.inviteeRut.trim()
            ? r.inviteeRut.trim()
            : (u?.rut ?? '')
        return {
          id: String(r._id),
          inviteeUserId: uid || null,
          inviteeName: u?.displayName ?? 'Jugador',
          inviteeImage: u?.imageUrl ?? null,
          inviteePopid: u?.popid ?? '',
          inviteeRut: formatRutOnBlur(storedRut) || storedRut,
          linkStatus:
            r.status === 'awaiting_user'
              ? ('awaiting_user' as const)
              : ('linked' as const),
          expiresAt: (r.expiresAt as Date).toISOString(),
          createdAt: r.createdAt.toISOString()
        }
      })
    }

    return NextResponse.json({
      team: {
        id: String(team._id),
        name: team.name,
        slug: team.slug,
        bio: team.bio ?? '',
        logoUrl: team.logoUrl ?? '',
        logoKey: team.logoKey ?? '',
        coverUrl: team.coverUrl ?? '',
        coverKey: team.coverKey ?? ''
      },
      viewer: {
        userId: gate.session.user!.id!,
        role: viewerMembership.role,
        roleLabel: TEAM_ROLE_LABELS[viewerMembership.role],
        canManage: canManageTeam(viewerMembership.role),
        isCaptain: isCaptain(viewerMembership.role),
        featuredDecklistId: viewerMembership.featuredDecklistId
          ? String(viewerMembership.featuredDecklistId)
          : null
      },
      members,
      invitations,
      memberCount: members.length
    })
  } catch (e) {
    console.error('GET /api/teams/[slug]/manage:', e)
    return NextResponse.json(
      { error: 'No se pudo cargar la gestión del equipo' },
      { status: 500 }
    )
  }
}
