import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { requireSessionUser } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { validateRutChile, rutForStorage } from '@/lib/rut-chile'
import { formatRutOnBlur } from '@/lib/rut-input'
import { TEAM_INVITATION_EXPIRY_DAYS } from '@/lib/teams/constants'
import {
  canManageTeam,
  getApprovedTeamBySlug,
  getMembershipForUserOnTeam
} from '@/lib/teams/access'
import { findUserByRut, teamInviteRutKey } from '@/lib/teams/invite-by-rut'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import TeamInvitation from '@/models/TeamInvitation'
import TeamMembership from '@/models/TeamMembership'
import User from '@/models/User'

function invitationExpiryDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + TEAM_INVITATION_EXPIRY_DAYS)
  return d
}

function rutDisplay(stored: string): string {
  return formatRutOnBlur(stored) || stored
}

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

    if (team.approvalStatus !== 'approved' && team.approvalStatus != null) {
      return NextResponse.json(
        { error: 'El equipo aún no está aprobado' },
        { status: 403 }
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

    await connectDB()
    const rows = await TeamInvitation.find({
      teamId: teamOid,
      status: { $in: ['pending', 'awaiting_user'] },
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .lean()

    const userIds = rows
      .map(r => r.inviteeUserId)
      .filter((id): id is mongoose.Types.ObjectId => id != null)
      .map(id => new mongoose.Types.ObjectId(String(id)))

    const users =
      userIds.length > 0
        ? await User.find({ _id: { $in: userIds } })
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

    const userById = new Map(
      users.map(u => {
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

    return NextResponse.json({
      invitations: rows.map(r => {
        const uid = r.inviteeUserId ? String(r.inviteeUserId) : ''
        const u = uid ? userById.get(uid) : undefined
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
          inviteeRut: rutDisplay(storedRut),
          linkStatus: r.status === 'awaiting_user' ? 'awaiting_user' : 'linked',
          expiresAt: (r.expiresAt as Date).toISOString(),
          createdAt: r.createdAt.toISOString()
        }
      })
    })
  } catch (e) {
    console.error('GET /api/teams/[slug]/invitations:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las invitaciones' },
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

    if (team.approvalStatus !== 'approved' && team.approvalStatus != null) {
      return NextResponse.json(
        { error: 'El equipo aún no está aprobado' },
        { status: 403 }
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
    const rutRaw = typeof body?.rut === 'string' ? body.rut.trim() : ''
    const rutErr = validateRutChile(rutRaw)
    if (rutErr) {
      return NextResponse.json({ error: rutErr }, { status: 400 })
    }

    const rutStored = rutForStorage(rutRaw)
    const rutKey = teamInviteRutKey(rutRaw)
    if (!rutStored || !rutKey) {
      return NextResponse.json({ error: 'RUT inválido' }, { status: 400 })
    }

    await connectDB()

    const inviter = await User.findById(gate.session.user!.id)
      .select('rut')
      .lean<{ rut?: string } | null>()
    if (inviter?.rut && teamInviteRutKey(inviter.rut) === rutKey) {
      return NextResponse.json(
        { error: 'No puedes invitarte a ti mismo' },
        { status: 400 }
      )
    }

    const invitee = await findUserByRut(rutRaw)

    if (invitee) {
      if (String(invitee._id) === gate.session.user!.id) {
        return NextResponse.json(
          { error: 'No puedes invitarte a ti mismo' },
          { status: 400 }
        )
      }

      const alreadyMember = await TeamMembership.exists({
        teamId: teamOid,
        userId: invitee._id,
        status: 'active'
      })
      if (alreadyMember) {
        return NextResponse.json(
          {
            error: 'Esa persona ya es miembro del equipo',
            code: 'already_member'
          },
          { status: 409 }
        )
      }

      const inOtherTeam = await TeamMembership.exists({
        userId: invitee._id,
        status: 'active'
      })
      if (inOtherTeam) {
        return NextResponse.json(
          {
            error: 'Esa persona ya pertenece a otro equipo',
            code: 'invitee_in_team'
          },
          { status: 409 }
        )
      }
    }

    const pendingDup = await TeamInvitation.findOne({
      teamId: teamOid,
      status: { $in: ['pending', 'awaiting_user'] },
      expiresAt: { $gt: new Date() },
      $or: [
        ...(invitee ? [{ inviteeUserId: invitee._id }] : []),
        { inviteeRutKey: rutKey }
      ]
    }).lean()
    if (pendingDup) {
      return NextResponse.json(
        {
          error: 'Ya hay una solicitud pendiente para ese RUT',
          code: 'invite_pending'
        },
        { status: 409 }
      )
    }

    const token = crypto.randomBytes(24).toString('hex')
    const status = invitee ? 'pending' : 'awaiting_user'

    const inv = await TeamInvitation.create({
      teamId: teamOid,
      invitedByUserId: new mongoose.Types.ObjectId(gate.session.user!.id!),
      inviteeUserId: invitee?._id,
      inviteeEmail:
        invitee && typeof invitee.email === 'string'
          ? invitee.email.trim().toLowerCase()
          : '',
      inviteeRut: rutStored,
      inviteeRutKey: rutKey,
      token,
      status,
      expiresAt: invitationExpiryDate()
    })

    return NextResponse.json(
      {
        invitation: {
          id: String(inv._id),
          inviteeUserId: invitee ? String(invitee._id) : null,
          inviteeRut: rutDisplay(rutStored),
          linkStatus: status === 'awaiting_user' ? 'awaiting_user' : 'linked',
          expiresAt: inv.expiresAt.toISOString()
        }
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /api/teams/[slug]/invitations:', e)
    return NextResponse.json(
      { error: 'No se pudo crear la solicitud' },
      { status: 500 }
    )
  }
}
